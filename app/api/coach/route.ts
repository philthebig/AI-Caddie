import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { revalidatePath } from 'next/cache'
import { getDbUser } from '@/lib/auth'
import { parseStoredCoachFeedback, serializeCoachFeedback } from '@/lib/coach/analysis'
import { buildCoachPayload } from '@/lib/coach/payload'
import { buildCoachPrompt } from '@/lib/coach/prompt'
import {
  COACH_MODES,
  coachAnalysisSchema,
  type CoachMode,
  type CoachRequestBody,
  type CoachResponseBody,
} from '@/lib/coach/types'
import { prisma } from '@/lib/db'
import type { Hole, Round } from '@prisma/client'

export const maxDuration = 30

type RoundWithHoles = Round & { holes: Hole[] }

function isCoachMode(value: unknown): value is CoachMode {
  return typeof value === 'string' && COACH_MODES.includes(value as CoachMode)
}

export async function POST(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CoachRequestBody
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { roundId, regenerate = false, holeNumber } = body
  const mode: CoachMode = isCoachMode(body.mode) ? body.mode : 'post_round'

  if (!roundId || typeof roundId !== 'string') {
    return Response.json({ error: 'roundId required' }, { status: 400 })
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true, holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) {
    return Response.json({ error: 'Round not found' }, { status: 404 })
  }

  if (mode === 'hole_recap' && (holeNumber == null || holeNumber < 1 || holeNumber > 18)) {
    return Response.json({ error: 'holeNumber required for hole_recap mode' }, { status: 400 })
  }

  if (!regenerate && round.aiFeedback) {
    const cached = parseStoredCoachFeedback(round.aiFeedback)
    if (cached) {
      const response: CoachResponseBody = { feedback: cached, cached: true }
      return Response.json(response)
    }
    // Legacy plain-text feedback — fall through to regenerate as structured
  }

  let recentRounds: RoundWithHoles[] = []
  if (mode === 'weekly_focus') {
    recentRounds = await prisma.round.findMany({
      where: {
        userId: dbUser.id,
        status: 'COMPLETED',
        id: { not: roundId },
      },
      include: { holes: { orderBy: { holeNumber: 'asc' } } },
      orderBy: { date: 'desc' },
      take: 5,
    })
  }

  const payload = buildCoachPayload(round, {
    mode,
    holeNumber,
    recentRounds,
  })

  const prompt = buildCoachPrompt(payload)

  try {
    const { object: analysis } = await generateObject({
      // Chat completions API — gpt-5 responses API often returns empty structured output.
      model: openai.chat('gpt-4o-mini'),
      schema: coachAnalysisSchema,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    const serialized = serializeCoachFeedback(analysis, mode)

    await prisma.round.update({
      where: { id: roundId },
      data: { aiFeedback: serialized },
    })

    revalidatePath('/')
    revalidatePath(`/rounds/${roundId}`)

    const feedback = parseStoredCoachFeedback(serialized)!
    const response: CoachResponseBody = { feedback, cached: false }
    return Response.json(response)
  } catch (err) {
    console.error('Coach generation failed:', err)
    return Response.json({ error: 'Failed to generate coach analysis' }, { status: 500 })
  }
}
