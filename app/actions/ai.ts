'use server'

import { formatRoundForAI } from '@/lib/golf-logic/aggregate'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateFeedback(roundId: string) {
  // 1. Fetch the round details
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true, holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round) return { error: "Round not found" }

  // 2. The Prompt
  const roundData = formatRoundForAI(round)

  const prompt = `
    You are an elite golf caddie focused on course management, dispersion patterns, and Strokes Gained analysis.

    Analyze this round using the OTT / APP / ARG / PUTT category breakdown:

    ${roundData}

    Identify the biggest weakness backed by the data.
    Give ONE specific, actionable drill to improve.
    Keep the tone encouraging but professional. Max 4 sentences.
  `

  try {
    // 3. Call the API using the new GPT-5 model
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini", // Updated to the latest cost-effective model!
      messages: [{ role: "user", content: prompt }],
    })

    const advice = response.choices[0].message.content || "No advice generated."

    // 4. Save to Database
    await prisma.round.update({
      where: { id: roundId },
      data: { aiFeedback: advice }
    })

    revalidatePath('/')
    return { success: true }

  } catch (error) {
    console.error("AI Error:", error)
    return { error: "Failed to generate feedback. Check your API Key." }
  }
}