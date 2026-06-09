import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { revalidatePath } from 'next/cache';
import { getDbUser } from '@/lib/auth';
import { formatRoundForAI } from '@/lib/golf-logic/aggregate';
import { prisma } from '@/lib/db';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const dbUser = await getDbUser();
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { roundId } = await req.json();

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { user: true, holes: { orderBy: { holeNumber: 'asc' } } },
  });

  if (!round || round.userId !== dbUser.id) {
    return Response.json({ error: 'Round not found' }, { status: 404 });
  }

  const roundData = formatRoundForAI(round);

  const prompt = `
    You are an elite golf caddie focused on course management, dispersion patterns, and Strokes Gained analysis — not swing mechanics.

    Analyze this round using the computed Strokes Gained breakdown and miss-direction patterns below.
    Use the SG numbers directly — do not invent or recalculate statistics.

    ${roundData}

    Identify the single biggest weakness backed by the Strokes Gained data and miss patterns (e.g. right-side OTT misses on long par 4s, short-sided APP misses, three-putt frequency).
    State approximately how many strokes that weakness cost using the SG figures provided.
    Give ONE specific, actionable drill to address it.
    Keep the tone encouraging but professional. Max 4 sentences.
  `;

  const result = streamText({
    model: openai('gpt-5-mini'),
    prompt: prompt,
    temperature: 0.7,

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
