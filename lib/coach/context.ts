import type { Hole, Round } from '@prisma/client'
import { formatRoundForAI } from '@/lib/golf-logic/aggregate'
import { computeTrendPoints } from '@/lib/golf-logic/trends'

type RoundWithHoles = Round & {
  holes: Hole[]
  user: { name: string | null }
}

export const COACH_CHAT_SYSTEM_RULES = `
You are an elite golf caddie and coach focused on course management, dispersion patterns, and Strokes Gained analysis — not swing mechanics.

CRITICAL RULES:
- Use ONLY the computed statistics and hole-by-hole data provided below. Never invent shot data, yardages, or tendencies the user did not log.
- When citing numbers, use the Strokes Gained and miss-pattern figures exactly as given.
- If the golfer asks about something not in the data, say what you can infer from logged stats and what you cannot know.
- Keep answers concise and actionable (2–5 sentences unless they ask for a detailed practice plan).
- Reference specific holes by number when relevant (e.g. "H7, H12").
- Tone: encouraging but professional — like a trusted caddie, not a lecture.
`.trim()

export function formatRecentRoundsSummary(
  rounds: (Round & { holes: Hole[] })[],
  excludeRoundId?: string
): string {
  const completed = rounds
    .filter((r) => r.id !== excludeRoundId && r.holes.length > 0)
    .slice(0, 5)

  if (completed.length === 0) {
    return '(No prior rounds with hole-by-hole data)'
  }

  const points = computeTrendPoints(completed)
  const lines = ['--- Recent rounds (last 5 with hole data) ---']

  for (const round of completed) {
    const point = points.find((p) => p.roundId === round.id)
    const date = round.date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    const gir = point?.girPct != null ? `${point.girPct}% GIR` : ''
    const fw = point?.fairwayPct != null ? `${point.fairwayPct}% FIR` : ''
    const stats = [gir, fw, `${point?.putts ?? round.totalPutts} putts`].filter(Boolean).join(', ')
    lines.push(`${date} — ${round.courseName}: ${round.totalScore} (${stats})`)
  }

  return lines.join('\n')
}

export function buildCoachChatSystemPrompt(
  round: RoundWithHoles,
  recentRounds: (Round & { holes: Hole[] })[] = []
): string {
  const roundData = formatRoundForAI(round)
  const recentSummary = formatRecentRoundsSummary(recentRounds, round.id)
  const priorFeedback = round.aiFeedback
    ? `\n--- Prior post-round coach summary ---\n${round.aiFeedback}`
    : ''

  return [
    COACH_CHAT_SYSTEM_RULES,
    '',
    '--- Current round (primary context) ---',
    roundData,
    '',
    recentSummary,
    priorFeedback,
  ]
    .filter(Boolean)
    .join('\n')
}

export function extractTextFromUIMessageParts(
  parts: { type: string; text?: string }[]
): string {
  const text = parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('')

  if (text.trim()) return text

  // Reasoning models may only surface output in reasoning parts in some stream modes
  return parts
    .filter((p) => p.type === 'reasoning' && p.text)
    .map((p) => p.text!)
    .join('')
}
