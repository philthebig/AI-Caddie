import type { Hole, Round } from '@prisma/client'
import type { HoleInput, RoundAggregates } from '@/lib/types/golf'
import { computeMissPatterns, formatMissPatterns } from './miss-patterns'
import { computeRoundStrokesGained, formatStrokesGained } from './strokes-gained'

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

export function computeRoundAggregates(
  holes: HoleInput[] | HoleLike[],
  coursePar?: number | null
): RoundAggregates {
  let fairwaysHit = 0
  let fairwayOpportunities = 0
  let greensInReg = 0
  let totalPutts = 0
  let totalScore = 0
  let penaltyStrokes = 0
  let parSum = 0
  let parCount = 0

  for (const hole of holes) {
    totalScore += hole.score
    totalPutts += hole.putts
    penaltyStrokes += hole.penaltyStrokes

    if (hole.gir) greensInReg++

    const par = hole.par ?? 4
    if (hole.par != null) {
      parSum += hole.par
      parCount++
    }

    if (par >= 4) {
      fairwayOpportunities++
      if (hole.ottMissDirection === 'HIT') fairwaysHit++
    }
  }

  return {
    totalScore,
    fairwaysHit,
    fairwayOpportunities,
    greensInReg,
    totalPutts,
    penaltyStrokes,
    coursePar: coursePar ?? (parCount > 0 ? parSum : null),
  }
}

export function formatRoundForAI(
  round: Round & { holes: HoleLike[]; user: { name: string | null } }
): string {
  const aggregates = computeRoundAggregates(round.holes, round.coursePar)
  const lines: string[] = [
    `Golfer: ${round.user.name ?? 'Player'}`,
    `Course: ${round.courseName}`,
    `Holes played: ${round.holeCount}`,
  ]

  if (aggregates.coursePar != null) {
    lines.push(`Course par: ${aggregates.coursePar}`)
    lines.push(`Score vs par: ${aggregates.totalScore - aggregates.coursePar >= 0 ? '+' : ''}${aggregates.totalScore - aggregates.coursePar}`)
  } else {
    lines.push(`Total score: ${aggregates.totalScore}`)
  }

  lines.push(
    `Fairways: ${aggregates.fairwaysHit}/${aggregates.fairwayOpportunities}`,
    `GIR: ${aggregates.greensInReg}/${round.holes.length}`,
    `Putts: ${aggregates.totalPutts}`,
    `Penalties: ${aggregates.penaltyStrokes}`
  )

  if (round.holes.length === 0) {
    lines.push('(No hole-by-hole data — legacy round with aggregates only)')
    return lines.join('\n')
  }

  const sg = computeRoundStrokesGained(round.holes)
  const missPatterns = computeMissPatterns(round.holes)

  lines.push(
    '',
    '--- Strokes Gained (computed — use these numbers directly) ---',
    formatStrokesGained(sg),
    '',
    formatMissPatterns(missPatterns),
    '',
    `Total putts: ${aggregates.totalPutts}`
  )

  lines.push('', '--- Hole-by-hole ---')
  for (const hole of [...round.holes].sort((a, b) => a.holeNumber - b.holeNumber)) {
    const par = hole.par ?? '?'
    const yard = hole.yardage != null ? ` ${hole.yardage}y` : ''
    const ott =
      hole.ottMissDirection != null ? ` OTT:${hole.ottMissDirection}` : ''
    const app = hole.gir
      ? ' GIR'
      : ` APP-miss:${hole.appMissDirection ?? '?'}${hole.approachProximity != null ? ` ${hole.approachProximity}ft` : ''}`
    const arg =
      hole.upAndDownAttempt != null
        ? ` ARG:${hole.upAndDownSuccess ? 'saved' : 'failed'}`
        : ''
    lines.push(
      `H${hole.holeNumber} (par ${par}${yard}): ${hole.score} (${hole.putts} putts${ott}${app}${arg})`
    )
  }

  return lines.join('\n')
}
