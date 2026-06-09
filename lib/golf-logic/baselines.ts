/**
 * Expected-strokes baselines for amateur golfers (~15 handicap).
 * Values are approximations from hole-level data — not tour-grade SG.
 */

export type YardageBucket = 'short' | 'mid' | 'long'

const DEFAULT_YARDAGE: Record<3 | 4 | 5, number> = { 3: 165, 4: 400, 5: 540 }

export function defaultYardage(par: number): number {
  if (par === 3 || par === 4 || par === 5) return DEFAULT_YARDAGE[par]
  return DEFAULT_YARDAGE[4]
}

export function yardageBucket(yardage: number, par: number): YardageBucket {
  if (par === 3) {
    if (yardage < 150) return 'short'
    if (yardage < 185) return 'mid'
    return 'long'
  }
  if (par === 5) {
    if (yardage < 500) return 'short'
    if (yardage < 560) return 'mid'
    return 'long'
  }
  // par 4
  if (yardage < 350) return 'short'
  if (yardage < 400) return 'mid'
  return 'long'
}

/** Expected strokes to hole out from the tee box. */
export function expectedStrokesFromTee(par: number, yardage?: number | null): number {
  const yds = yardage ?? defaultYardage(par as 3 | 4 | 5)

  if (par === 3) {
    return 3.25 + Math.max(0, yds - 150) * 0.002
  }
  if (par === 5) {
    return 5.05 + Math.max(0, yds - 520) * 0.0007
  }
  return 4.15 + Math.max(0, yds - 380) * 0.001
}

/** Expected putts given green-in-regulation status and proximity (feet). */
export function expectedPutts(
  gir: boolean,
  approachProximity?: number | null,
  argProximity?: number | null
): number {
  if (gir) return 2.05

  const proximity = argProximity ?? approachProximity
  if (proximity == null) return 2.15

  if (proximity <= 10) return 1.75
  if (proximity <= 20) return 1.9
  if (proximity <= 35) return 2.05
  if (proximity <= 50) return 2.2
  return 2.35
}

/** OTT cost relative to a fairway hit (0 = neutral). Negative = strokes lost. */
export function ottMissCost(
  direction: 'LEFT' | 'HIT' | 'RIGHT',
  yardage: number,
  par: number
): number {
  if (direction === 'HIT') return 0

  const bucket = yardageBucket(yardage, par)
  const base = bucket === 'long' ? -0.55 : bucket === 'mid' ? -0.45 : -0.35
  return base
}

/** APP strokes gained proxy when the green was hit in regulation. */
export function appGirGain(yardage: number, par: number): number {
  const bucket = yardageBucket(yardage, par)
  if (bucket === 'long') return 0.45
  if (bucket === 'mid') return 0.35
  return 0.25
}

/** APP strokes lost proxy on a missed green (before ARG/putting). */
export function appMissCost(
  direction: 'LEFT' | 'RIGHT' | 'SHORT' | 'LONG',
  proximityFeet: number,
  yardage: number,
  par: number
): number {
  let cost: number
  if (proximityFeet <= 20) cost = -0.25
  else if (proximityFeet <= 40) cost = -0.55
  else if (proximityFeet <= 60) cost = -0.9
  else cost = -1.35

  const directionMult =
    direction === 'SHORT' ? 1.15 : direction === 'LONG' ? 1.0 : 1.05
  const bucket = yardageBucket(yardage, par)
  const yardageMult = bucket === 'long' ? 1.1 : 1.0

  return cost * directionMult * yardageMult
}

/** ARG strokes gained proxy for an up-and-down attempt. */
export function argAttemptGain(
  saved: boolean,
  argProximity?: number | null
): number {
  if (saved) {
    const prox = argProximity ?? 15
    return prox <= 10 ? 0.55 : prox <= 25 ? 0.4 : 0.25
  }
  return -0.65
}

/** ARG cost when GIR was missed but no up-and-down was attempted. */
export function argNoAttemptCost(approachProximity?: number | null): number {
  if (approachProximity == null) return -0.35
  if (approachProximity <= 30) return -0.2
  if (approachProximity <= 60) return -0.4
  return -0.55
}
