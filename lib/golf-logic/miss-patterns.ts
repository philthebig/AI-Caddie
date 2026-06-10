import type {
  ArgProximityBand,
  BlowUpHole,
  HoleInput,
  MissPatternSummary,
  MissSegment,
  YardageBucket,
} from '@/lib/types/golf'
import { defaultYardage, yardageBucket } from './baselines'
import { computeHoleStrokesGained } from './strokes-gained'

/** SHORT miss within this distance (ft) of the green → short-sided. */
const SHORT_SIDED_MAX_PROXIMITY_FT = 30

type HoleLike = {
  holeNumber: number
  par?: number | null
  yardage?: number | null
  score: number
  putts: number
  penaltyStrokes?: number
  ottMissDirection?: HoleInput['ottMissDirection']
  gir: boolean
  appMissDirection?: HoleInput['appMissDirection']
  approachProximity?: number | null
  upAndDownAttempt?: boolean | null
  upAndDownSuccess?: boolean | null
  argProximity?: number | null
}

function yardageBucketLabel(bucket: YardageBucket, par: number): string {
  if (par === 3) {
    if (bucket === 'short') return 'under 150y'
    if (bucket === 'mid') return '150–184y'
    return '185y+'
  }
  if (par === 5) {
    if (bucket === 'short') return 'under 500y'
    if (bucket === 'mid') return '500–559y'
    return '560y+'
  }
  if (bucket === 'short') return 'under 350y'
  if (bucket === 'mid') return '350–399y'
  return '400y+'
}

function segmentKey(
  category: 'OTT' | 'APP',
  direction: string,
  par?: number,
  bucket?: YardageBucket
): string {
  return [category, direction, par ?? '*', bucket ?? '*'].join('|')
}

type OpportunityCounts = {
  ott: Map<string, number>
  app: Map<string, number>
}

function bucketKey(par: number, bucket: YardageBucket): string {
  return `${par}|${bucket}`
}

function buildOpportunityCounts(holes: HoleLike[]): OpportunityCounts {
  const ott = new Map<string, number>()
  const app = new Map<string, number>()

  for (const hole of holes) {
    const par = hole.par ?? 4
    const yardage = hole.yardage ?? defaultYardage(par as 3 | 4 | 5)
    const bucket = yardageBucket(yardage, par)
    const key = bucketKey(par, bucket)

    if (par >= 4) {
      ott.set(key, (ott.get(key) ?? 0) + 1)
    }
    if (!hole.gir) {
      app.set(key, (app.get(key) ?? 0) + 1)
    }
  }

  return { ott, app }
}

function upsertSegment(
  map: Map<string, MissSegment>,
  segment: Omit<MissSegment, 'count' | 'holes'> & { holeNumber: number }
): void {
  const key = segmentKey(segment.category, segment.direction, segment.par, segment.yardageBucket)
  const existing = map.get(key)
  if (existing) {
    existing.count++
    existing.holes.push(segment.holeNumber)
    return
  }
  map.set(key, {
    label: segment.label,
    category: segment.category,
    direction: segment.direction,
    par: segment.par,
    yardageBucket: segment.yardageBucket,
    count: 1,
    opportunities: segment.opportunities,
    holes: [segment.holeNumber],
  })
}

function argProximityBand(proximity: number | null | undefined): ArgProximityBand['band'] {
  const ft = proximity ?? 25
  if (ft < 15) return '<15ft'
  if (ft < 30) return '15-30ft'
  return '30+ft'
}

function blowUpPrimaryCause(
  hole: HoleLike,
  sg: ReturnType<typeof computeHoleStrokesGained>
): BlowUpHole['primaryCause'] {
  const categories: [BlowUpHole['primaryCause'], number][] = [
    ['OTT', sg.ott],
    ['APP', sg.app],
    ['ARG', sg.arg],
    ['PUTT', sg.putt],
  ]

  if ((hole.penaltyStrokes ?? 0) > 0) {
    return 'OTT'
  }

  categories.sort((a, b) => a[1] - b[1])
  return categories[0][1] < 0 ? categories[0][0] : 'PUTT'
}

export function computeMissPatterns(holes: HoleLike[]): MissPatternSummary {
  const opportunities = buildOpportunityCounts(holes)
  const ottSegments = new Map<string, MissSegment>()
  const appSegments = new Map<string, MissSegment>()
  const shortSidedHoles: number[] = []

  const ottTotals = { left: 0, right: 0 }
  const appTotals = { left: 0, right: 0, short: 0, long: 0 }

  const argBands: Record<ArgProximityBand['band'], { attempts: number; saves: number }> = {
    '<15ft': { attempts: 0, saves: 0 },
    '15-30ft': { attempts: 0, saves: 0 },
    '30+ft': { attempts: 0, saves: 0 },
  }
  let argAttempts = 0
  let argSaves = 0

  const threePuttOnGir = { threePutts: 0, opportunities: 0 }
  const threePuttOffGir = { threePutts: 0, opportunities: 0 }

  const blowUps: BlowUpHole[] = []

  for (const hole of holes) {
    const par = hole.par ?? 4
    const yardage = hole.yardage ?? defaultYardage(par as 3 | 4 | 5)
    const bucket = yardageBucket(yardage, par)
    const bucketLabel = yardageBucketLabel(bucket, par)

    // OTT — par 4/5 only
    if (par >= 4) {
      const dir = hole.ottMissDirection
      if (dir === 'LEFT') ottTotals.left++
      if (dir === 'RIGHT') ottTotals.right++

      if (dir === 'LEFT' || dir === 'RIGHT') {
        upsertSegment(ottSegments, {
          label: `${dir} OTT on par ${par}s (${bucketLabel})`,
          category: 'OTT',
          direction: dir,
          par,
          yardageBucket: bucket,
          opportunities: opportunities.ott.get(bucketKey(par, bucket)) ?? 1,
          holeNumber: hole.holeNumber,
        })
      }
    }

    // APP — missed GIR only
    if (!hole.gir && hole.appMissDirection) {
      const dir = hole.appMissDirection
      if (dir === 'LEFT') appTotals.left++
      else if (dir === 'RIGHT') appTotals.right++
      else if (dir === 'SHORT') appTotals.short++
      else if (dir === 'LONG') appTotals.long++

      upsertSegment(appSegments, {
        label: `${dir} APP miss on par ${par}s (${bucketLabel})`,
        category: 'APP',
        direction: dir,
        par,
        yardageBucket: bucket,
        opportunities: opportunities.app.get(bucketKey(par, bucket)) ?? 1,
        holeNumber: hole.holeNumber,
      })

      if (
        dir === 'SHORT' &&
        hole.approachProximity != null &&
        hole.approachProximity <= SHORT_SIDED_MAX_PROXIMITY_FT
      ) {
        shortSidedHoles.push(hole.holeNumber)
      }
    }

    // ARG — up-and-down attempts when GIR missed
    if (!hole.gir && hole.upAndDownAttempt) {
      argAttempts++
      const band = argProximityBand(hole.argProximity ?? hole.approachProximity)
      argBands[band].attempts++
      if (hole.upAndDownSuccess) {
        argSaves++
        argBands[band].saves++
      }
    }

    // PUTT — three-putt rates split by GIR
    const puttBucket = hole.gir ? threePuttOnGir : threePuttOffGir
    puttBucket.opportunities++
    if (hole.putts >= 3) puttBucket.threePutts++

    // Blow-up holes (double bogey or worse)
    const vsPar = hole.score - par
    if (vsPar >= 2) {
      const sg = computeHoleStrokesGained(hole)
      const cause = blowUpPrimaryCause(hole, sg)
      const categoryValue =
        cause === 'OTT' ? sg.ott : cause === 'APP' ? sg.app : cause === 'ARG' ? sg.arg : sg.putt

      blowUps.push({
        holeNumber: hole.holeNumber,
        score: hole.score,
        par,
        vsPar,
        primaryCause: cause,
        strokesLost: Math.round(Math.abs(Math.min(0, categoryValue)) * 10) / 10,
      })
    }
  }

  const sortSegments = (segments: Map<string, MissSegment>): MissSegment[] =>
    [...segments.values()].sort((a, b) => b.count - a.count || b.count / b.opportunities - a.count / a.opportunities)

  return {
    ott: {
      totalMisses: ottTotals,
      segments: sortSegments(ottSegments),
    },
    app: {
      totalMisses: appTotals,
      segments: sortSegments(appSegments),
      shortSided: { count: shortSidedHoles.length, holes: shortSidedHoles },
    },
    arg: {
      proximityBands: (['<15ft', '15-30ft', '30+ft'] as const).map((band) => ({
        band,
        attempts: argBands[band].attempts,
        saves: argBands[band].saves,
      })),
      overall: { attempts: argAttempts, saves: argSaves },
    },
    putt: {
      onGir: threePuttOnGir,
      offGir: threePuttOffGir,
    },
    blowUps: blowUps.sort((a, b) => b.vsPar - a.vsPar),
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return 'n/a'
  return `${Math.round((n / total) * 100)}%`
}

function formatSegment(seg: MissSegment): string {
  const holes = seg.holes.map((h) => `H${h}`).join(', ')
  return `${seg.label}: ${seg.count} of ${seg.opportunities} (${holes})`
}

export function formatMissPatterns(summary: MissPatternSummary): string {
  const lines: string[] = ['--- Segmented miss patterns (computed — cite these with hole numbers) ---']

  const { ott, app, arg, putt, blowUps } = summary

  lines.push(
    `OTT totals: Left ${ott.totalMisses.left}, Right ${ott.totalMisses.right}`
  )
  if (ott.segments.length > 0) {
    lines.push('OTT segments:')
    for (const seg of ott.segments.slice(0, 5)) {
      lines.push(`  ${formatSegment(seg)}`)
    }
  }

  lines.push(
    `APP totals: Left ${app.totalMisses.left}, Right ${app.totalMisses.right}, Short ${app.totalMisses.short}, Long ${app.totalMisses.long}`
  )
  if (app.segments.length > 0) {
    lines.push('APP segments:')
    for (const seg of app.segments.slice(0, 5)) {
      lines.push(`  ${formatSegment(seg)}`)
    }
  }
  if (app.shortSided.count > 0) {
    const holes = app.shortSided.holes.map((h) => `H${h}`).join(', ')
    lines.push(
      `Short-sided APP (SHORT miss ≤${SHORT_SIDED_MAX_PROXIMITY_FT} ft): ${app.shortSided.count} (${holes})`
    )
  }

  if (arg.overall.attempts > 0) {
    lines.push(
      `ARG up-and-down overall: ${arg.overall.saves}/${arg.overall.attempts} (${pct(arg.overall.saves, arg.overall.attempts)})`
    )
    for (const band of arg.proximityBands) {
      if (band.attempts > 0) {
        lines.push(
          `  ${band.band}: ${band.saves}/${band.attempts} saved (${pct(band.saves, band.attempts)})`
        )
      }
    }
  }

  if (putt.onGir.opportunities > 0 || putt.offGir.opportunities > 0) {
    lines.push('Three-putt rate:')
    if (putt.onGir.opportunities > 0) {
      lines.push(
        `  On GIR: ${putt.onGir.threePutts}/${putt.onGir.opportunities} (${pct(putt.onGir.threePutts, putt.onGir.opportunities)})`
      )
    }
    if (putt.offGir.opportunities > 0) {
      lines.push(
        `  Off GIR: ${putt.offGir.threePutts}/${putt.offGir.opportunities} (${pct(putt.offGir.threePutts, putt.offGir.opportunities)})`
      )
    }
  }

  if (blowUps.length > 0) {
    lines.push('Blow-up holes (+2 or worse vs par):')
    for (const b of blowUps) {
      lines.push(
        `  H${b.holeNumber}: ${b.score} on par ${b.par} (+${b.vsPar}) — primary leak: ${b.primaryCause}${b.strokesLost > 0 ? ` (~${b.strokesLost} SG)` : ''}`
      )
    }
  }

  return lines.join('\n')
}
