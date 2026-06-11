import type { Hole, Round } from '@prisma/client'
import { getDrillsForCategories } from '@/lib/coach/drills'
import type { SgCategory } from '@/lib/coach/types'
import { computeMissPatterns } from '@/lib/golf-logic/miss-patterns'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'

export type PracticeFocus = {
  headline: string
  detail: string
  category: SgCategory
  roundCount: number
  avgSg: number
  drillName: string | null
  trendNote: string | null
}

const CATEGORY_LABELS: Record<SgCategory, string> = {
  OTT: 'Off the tee',
  APP: 'Approach play',
  ARG: 'Around the green',
  PUTT: 'Putting',
}

type RoundWithHoles = Round & { holes: Hole[] }

function formatSg(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}

/** Recurring miss label → count across rounds (segment must appear in ≥2 rounds). */
function findRecurringMiss(rounds: RoundWithHoles[]): string | null {
  const labelRounds = new Map<string, number>()

  for (const round of rounds) {
    const patterns = computeMissPatterns(round.holes)
    const seenThisRound = new Set<string>()

    for (const seg of [...patterns.ott.segments, ...patterns.app.segments].slice(0, 3)) {
      if (seg.count < 2) continue
      const key = seg.label
      if (seenThisRound.has(key)) continue
      seenThisRound.add(key)
      labelRounds.set(key, (labelRounds.get(key) ?? 0) + 1)
    }

    if (patterns.app.shortSided.count >= 2) {
      const key = 'Short-sided approach misses'
      if (!seenThisRound.has(key)) {
        seenThisRound.add(key)
        labelRounds.set(key, (labelRounds.get(key) ?? 0) + 1)
      }
    }
  }

  const best = [...labelRounds.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0]

  if (!best) return null
  const [label, count] = best
  return `${label} in ${count} of last ${rounds.length} rounds`
}

/**
 * Top practice focus from recent completed rounds (≥3 with hole data).
 * Lightweight precursor to full Phase 3 multi-round insights.
 */
export function computePracticeFocus(rounds: RoundWithHoles[]): PracticeFocus | null {
  const withHoles = rounds.filter((r) => r.status === 'COMPLETED' && r.holes.length > 0)
  if (withHoles.length < 3) return null

  const recent = withHoles.slice(0, 10)
  const n = recent.length

  const totals = { OTT: 0, APP: 0, ARG: 0, PUTT: 0 } as Record<SgCategory, number>

  for (const round of recent) {
    const sg = computeRoundStrokesGained(round.holes)
    totals.OTT += sg.ott
    totals.APP += sg.app
    totals.ARG += sg.arg
    totals.PUTT += sg.putt
  }

  const avgs = (Object.keys(totals) as SgCategory[]).map((cat) => ({
    cat,
    avg: totals[cat] / n,
  }))

  avgs.sort((a, b) => a.avg - b.avg)
  const weakest = avgs[0]
  const category = weakest.cat
  const avgSg = Math.round(weakest.avg * 10) / 10

  const drill = getDrillsForCategories([category])[0] ?? null
  const trendNote = findRecurringMiss(recent)

  const headline =
    avgSg < 0
      ? `Practice focus: ${CATEGORY_LABELS[category]}`
      : `Keep sharpening: ${CATEGORY_LABELS[category]}`

  const detail =
    avgSg < 0
      ? `${formatSg(avgSg)} SG ${category} avg over last ${n} rounds`
      : `Lowest category at ${formatSg(avgSg)} over last ${n} rounds — room to gain strokes`

  return {
    headline,
    detail,
    category,
    roundCount: n,
    avgSg,
    drillName: drill?.name ?? null,
    trendNote,
  }
}
