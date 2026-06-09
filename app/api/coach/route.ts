import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. Get the round ID from the incoming request
  const { roundId } = await req.json();

  // 2. Fetch the round data
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true }
  });

  if (!round) {
    return Response.json({ error: 'Round not found' }, { status: 404 });
  }

  // 3. Define the Prompt
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
  `;

  // 4. Stream the text!
  const result = streamText({
    model: openai('gpt-5-mini'), // <--- Using your verified model!
    prompt: prompt,
    temperature: 0.7, // Now allowed since we are using the SDK!
    
    // 5. MAGIC: Save the full response to the DB when it finishes
    onFinish: async ({ text }) => {
      await prisma.round.update({
        where: { id: roundId },
        data: { aiFeedback: text },
      });
      revalidatePath('/');
    },
  });

  return result.toTextStreamResponse();
}