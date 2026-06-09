import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { revalidatePath } from 'next/cache';
import { formatRoundForAI } from '@/lib/golf-logic/aggregate';
import { prisma } from '@/lib/db';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // 1. Get the round ID from the incoming request
  const { roundId } = await req.json();

  // 2. Fetch the round data
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true, holes: { orderBy: { holeNumber: 'asc' } } },
  });

  if (!round) {
    return Response.json({ error: 'Round not found' }, { status: 404 });
  }

  // 3. Define the Prompt
  const roundData = formatRoundForAI(round);

  const prompt = `
    You are an elite golf caddie focused on course management, dispersion patterns, and Strokes Gained analysis — not swing mechanics.

    Analyze this round using the OTT / APP / ARG / PUTT category breakdown and miss-direction patterns:

    ${roundData}

    Identify the single biggest weakness backed by the data (e.g. right-side OTT misses, short-sided APP misses, three-putt frequency).
    Give ONE specific, actionable drill to address it.
    Keep the tone encouraging but professional. Max 4 sentences.
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