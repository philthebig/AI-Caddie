'use server'

import { getDbUser } from '@/lib/auth'
import { formatRoundForAI } from '@/lib/golf-logic/aggregate'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateFeedback(roundId: string) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true, holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  const roundData = formatRoundForAI(round)

  const prompt = `
    You are an elite golf caddie focused on course management, dispersion patterns, and Strokes Gained analysis.

    Analyze this round using the computed Strokes Gained breakdown and miss-direction patterns below.
    Use the SG numbers directly — do not invent or recalculate statistics.

    ${roundData}

    Identify the biggest weakness backed by the Strokes Gained data.
    Give ONE specific, actionable drill to improve.
    Keep the tone encouraging but professional. Max 4 sentences.
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
    })

    const advice = response.choices[0].message.content || 'No advice generated.'

    await prisma.round.update({
      where: { id: roundId },
      data: { aiFeedback: advice },
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('AI Error:', error)
    return { error: 'Failed to generate feedback. Check your API Key.' }
  }
}
