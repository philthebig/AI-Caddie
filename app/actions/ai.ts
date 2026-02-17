'use server'

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
    include: { user: true }
  })

  if (!round) return { error: "Round not found" }

  // 2. The Prompt
  const prompt = `
    You are an elite golf caddie. Analyze this round for ${round.user.name}:
    
    Score: ${round.totalScore}
    Fairways Hit: ${round.fairwaysHit}
    Greens in Regulation: ${round.greensInReg}
    Putts: ${round.totalPutts}
    Penalties: ${round.penaltyStrokes}

    Identify the biggest weakness.
    Give ONE specific, actionable drill to improve.
    Keep the tone encouraging but professional. Max 3 sentences.
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