import type { Hole, Round } from '@prisma/client'
import { computeRoundAggregates } from './aggregate'

export type TrendPoint = {
  roundId: string
  date: Date
  label: string
  girPct: number | null
  fairwayPct: number | null
  putts: number
  holeCount: number
}

type RoundWithHoles = Round & { holes: Hole[] }

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function computeTrendPoints(rounds: RoundWithHoles[]): TrendPoint[] {
  return [...rounds]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((round) => {
      const holeCount = round.holes.length > 0 ? round.holes.length : round.holeCount
      const aggregates =
        round.holes.length > 0
          ? computeRoundAggregates(round.holes, round.coursePar)
          : {
              greensInReg: round.greensInReg,
              fairwaysHit: round.fairwaysHit,
              fairwayOpportunities: 0,
              totalPutts: round.totalPutts,
            }

      const girPct =
        holeCount > 0 ? Math.round((aggregates.greensInReg / holeCount) * 100) : null

      const fairwayPct =
        aggregates.fairwayOpportunities > 0
          ? Math.round((aggregates.fairwaysHit / aggregates.fairwayOpportunities) * 100)
          : round.fairwaysHit > 0 && holeCount > 0
            ? Math.round((round.fairwaysHit / Math.max(holeCount - 4, 1)) * 100)
            : null

      return {
        roundId: round.id,
        date: round.date,
        label: shortDate(round.date),
        girPct,
        fairwayPct,
        putts: aggregates.totalPutts,
        holeCount,
      }
    })
}

export type TrendSeries = {
  key: 'girPct' | 'fairwayPct' | 'putts'
  label: string
  unit: string
  color: string
  values: { label: string; value: number | null }[]
}

export function buildTrendSeries(points: TrendPoint[]): TrendSeries[] {
  if (points.length === 0) return []

  return [
    {
      key: 'girPct',
      label: 'GIR',
      unit: '%',
      color: '#059669',
      values: points.map((p) => ({ label: p.label, value: p.girPct })),
    },
    {
      key: 'fairwayPct',
      label: 'Fairways',
      unit: '%',
      color: '#0d9488',
      values: points.map((p) => ({ label: p.label, value: p.fairwayPct })),
    },
    {
      key: 'putts',
      label: 'Putts',
      unit: '',
      color: '#6366f1',
      values: points.map((p) => ({ label: p.label, value: p.putts })),
    },
  ]
}
