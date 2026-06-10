import type { Hole, Round } from '@prisma/client'
import type { RoundAggregates, StrokesGainedBreakdown, MissPatternSummary } from '@/lib/types/golf'
import type { SgCategory } from '@/lib/coach/types'
import { computeRoundAggregates, formatRoundForAI } from '@/lib/golf-logic/aggregate'
import { computeMissPatterns } from '@/lib/golf-logic/miss-patterns'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'
import { formatRecentRoundsSummary } from '@/lib/coach/context'
import { getDrillsForCategories, type DrillEntry } from '@/lib/coach/drills'
import type { CoachMode } from '@/lib/coach/types'

type HoleLike = Pick<
  Hole,
  | 'holeNumber'
  | 'par'
  | 'yardage'
  | 'score'
  | 'putts'
  | 'penaltyStrokes'
  | 'ottMissDirection'
  | 'gir'
  | 'appMissDirection'
  | 'approachProximity'
  | 'upAndDownAttempt'
  | 'upAndDownSuccess'
  | 'argProximity'
>

export type CoachPayloadRound = Round & {
  holes: HoleLike[]
  user: { name: string | null }
}

export type CoachPayload = {
  mode: CoachMode
  roundId: string
  golferName: string
  courseName: string
  holeCount: number
  aggregates: RoundAggregates
  strokesGained: StrokesGainedBreakdown
  missPatterns: MissPatternSummary
  /** Human-readable stats block for the model prompt */
  humanSummary: string
  /** Ranked SG categories (worst first) for drill suggestions */
  priorityCategories: SgCategory[]
  suggestedDrills: DrillEntry[]
  holeNumber?: number
  recentRoundsSummary?: string
}

function rankSgCategories(sg: StrokesGainedBreakdown): SgCategory[] {
  const entries: { category: SgCategory; value: number }[] = [
    { category: 'OTT', value: sg.ott },
    { category: 'APP', value: sg.app },
    { category: 'ARG', value: sg.arg },
    { category: 'PUTT', value: sg.putt },
  ]
  return entries.sort((a, b) => a.value - b.value).map((e) => e.category)
}

export function buildCoachPayload(
  round: CoachPayloadRound,
  options: {
    mode?: CoachMode
    holeNumber?: number
    recentRounds?: (Round & { holes: Hole[] })[]
  } = {}
): CoachPayload {
  const mode = options.mode ?? 'post_round'
  const aggregates = computeRoundAggregates(round.holes, round.coursePar)
  const strokesGained = computeRoundStrokesGained(round.holes)
  const missPatterns = computeMissPatterns(round.holes)
  const priorityCategories = rankSgCategories(strokesGained)
  const suggestedDrills = getDrillsForCategories(priorityCategories)

  let humanSummary = formatRoundForAI(round)

  if (options.recentRounds && options.recentRounds.length > 0) {
    humanSummary += `\n\n${formatRecentRoundsSummary(options.recentRounds, round.id)}`
  }

  if (options.holeNumber != null) {
    const hole = round.holes.find((h) => h.holeNumber === options.holeNumber)
    if (hole) {
      const par = hole.par ?? '?'
      humanSummary += `\n\n--- Focus hole H${hole.holeNumber} (par ${par}) ---\nScore: ${hole.score}, Putts: ${hole.putts}`
      if (hole.ottMissDirection) humanSummary += `, OTT: ${hole.ottMissDirection}`
      if (!hole.gir) {
        humanSummary += `, APP miss: ${hole.appMissDirection ?? '?'}`
        if (hole.approachProximity != null) humanSummary += ` (${hole.approachProximity} ft)`
      } else {
        humanSummary += ', GIR'
      }
    }
  }

  return {
    mode,
    roundId: round.id,
    golferName: round.user.name ?? 'Player',
    courseName: round.courseName,
    holeCount: round.holeCount,
    aggregates,
    strokesGained,
    missPatterns,
    humanSummary,
    priorityCategories,
    suggestedDrills,
    holeNumber: options.holeNumber,
    recentRoundsSummary:
      options.recentRounds && options.recentRounds.length > 0
        ? formatRecentRoundsSummary(options.recentRounds, round.id)
        : undefined,
  }
}
