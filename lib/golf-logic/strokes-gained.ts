import type { HoleInput, StrokesGainedBreakdown, StrokesGainedHole } from '@/lib/types/golf'
import {
  appGirGain,
  appMissCost,
  argAttemptGain,
  argNoAttemptCost,
  defaultYardage,
  expectedPutts,
  expectedStrokesFromTee,
  ottMissCost,
} from './baselines'

type HoleLike = Pick<
  HoleInput,
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

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function computeHoleStrokesGained(hole: HoleLike): StrokesGainedHole {
  const par = hole.par ?? 4
  const yardage = hole.yardage ?? defaultYardage(par as 3 | 4 | 5)

  let ott = 0
  let app = 0
  let arg = 0

  // PUTT — most directly observable
  const putt = round1(
    expectedPutts(hole.gir, hole.approachProximity, hole.argProximity) - hole.putts
  )

  // OTT — par 4/5 only
  if (par >= 4 && hole.ottMissDirection) {
    ott = round1(ottMissCost(hole.ottMissDirection, yardage, par))
  }
  if (hole.penaltyStrokes > 0) {
    ott = round1(ott - hole.penaltyStrokes)
  }

  // APP
  if (hole.gir) {
    app = round1(appGirGain(yardage, par))
  } else if (hole.appMissDirection) {
    const proximity = hole.approachProximity ?? 45
    app = round1(appMissCost(hole.appMissDirection, proximity, yardage, par))
  }

  // ARG — only when GIR missed
  if (!hole.gir) {
    if (hole.upAndDownAttempt) {
      arg = round1(argAttemptGain(hole.upAndDownSuccess ?? false, hole.argProximity))
    } else {
      arg = round1(argNoAttemptCost(hole.approachProximity))
    }
  }

  const total = round1(ott + app + arg + putt)

  // Total-hole sanity check vs score (informational; categories may not sum exactly)
  const expectedFromTee = expectedStrokesFromTee(par, yardage)
  const totalVsScore = round1(expectedFromTee - hole.score)

  return {
    holeNumber: hole.holeNumber,
    ott,
    app,
    arg,
    putt,
    total,
    totalVsScore,
  }
}

export function computeRoundStrokesGained(holes: HoleLike[]): StrokesGainedBreakdown {
  const perHole = holes.map(computeHoleStrokesGained)

  const sum = perHole.reduce(
    (acc, h) => ({
      ott: acc.ott + h.ott,
      app: acc.app + h.app,
      arg: acc.arg + h.arg,
      putt: acc.putt + h.putt,
      total: acc.total + h.total,
      totalVsScore: acc.totalVsScore + h.totalVsScore,
    }),
    { ott: 0, app: 0, arg: 0, putt: 0, total: 0, totalVsScore: 0 }
  )

  return {
    ott: round1(sum.ott),
    app: round1(sum.app),
    arg: round1(sum.arg),
    putt: round1(sum.putt),
    total: round1(sum.total),
    totalVsScore: round1(sum.totalVsScore),
    perHole,
  }
}

export function formatStrokesGained(sg: StrokesGainedBreakdown): string {
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  const lines = [
    `Strokes Gained (estimated): Total ${sign(sg.total)}`,
    `  OTT: ${sign(sg.ott)} | APP: ${sign(sg.app)} | ARG: ${sign(sg.arg)} | PUTT: ${sign(sg.putt)}`,
  ]

  const weakest = (
    [
      ['OTT', sg.ott],
      ['APP', sg.app],
      ['ARG', sg.arg],
      ['PUTT', sg.putt],
    ] as const
  ).sort((a, b) => a[1] - b[1])[0]

  lines.push(`Weakest category: ${weakest[0]} (${sign(weakest[1])})`)

  return lines.join('\n')
}
