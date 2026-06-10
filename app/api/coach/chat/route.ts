import { openai } from '@ai-sdk/openai'
import {
  convertToModelMessages,
  generateId,
  streamText,
  type UIMessage,
} from 'ai'
import { getDbUser } from '@/lib/auth'
import { buildCoachChatSystemPrompt, extractTextFromUIMessageParts } from '@/lib/coach/context'
import {
  checkCoachChatRateLimit,
  COACH_DAILY_MESSAGE_LIMIT,
  COACH_ROUND_MESSAGE_LIMIT,
} from '@/lib/coach/rate-limit'
import { prisma } from '@/lib/db'

export const maxDuration = 30

type ChatRequestBody = {
  messages: UIMessage[]
  roundId?: string
}

export async function POST(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequestBody
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages, roundId } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages required' }, { status: 400 })
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'user') {
    return Response.json({ error: 'Last message must be from user' }, { status: 400 })
  }

  const rateLimit = await checkCoachChatRateLimit(dbUser.id, roundId)
  if (!rateLimit.allowed) {
    const msg =
      rateLimit.reason === 'daily'
        ? `Daily limit of ${COACH_DAILY_MESSAGE_LIMIT} messages reached. Try again tomorrow.`
        : `Round limit of ${COACH_ROUND_MESSAGE_LIMIT} messages reached.`
    return Response.json({ error: msg }, { status: 429 })
  }

  let systemPrompt =
    'You are an elite golf caddie. The golfer has not linked a specific round — answer general golf questions briefly and encourage them to log rounds for personalized coaching.'

  if (roundId) {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        user: true,
        holes: { orderBy: { holeNumber: 'asc' } },
      },
    })

    if (!round || round.userId !== dbUser.id) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    const recentRounds = await prisma.round.findMany({
      where: {
        userId: dbUser.id,
        status: 'COMPLETED',
        id: { not: roundId },
      },
      include: { holes: { orderBy: { holeNumber: 'asc' } } },
      orderBy: { date: 'desc' },
      take: 5,
    })

    systemPrompt = buildCoachChatSystemPrompt(round, recentRounds)
  }

  const userText = extractTextFromUIMessageParts(lastMessage.parts)
  if (userText.trim()) {
    await prisma.coachMessage.create({
      data: {
        userId: dbUser.id,
        roundId: roundId ?? null,
        role: 'USER',
        content: userText.trim(),
      },
    })
  }

  // Chat completions API — reliable text parts for useChat (gpt-5 responses API
  // can finish without surfacing text in the UI message stream).
  const result = streamText({
    model: openai.chat('gpt-4o-mini'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 600,
    onFinish: async ({ text }) => {
      const assistantText = text.trim()
      if (!assistantText) return

      try {
        await prisma.coachMessage.create({
          data: {
            userId: dbUser.id,
            roundId: roundId ?? null,
            role: 'ASSISTANT',
            content: assistantText,
          },
        })
      } catch (err) {
        console.error('Failed to persist coach chat reply:', err)
      }
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => generateId(),
  })
}
