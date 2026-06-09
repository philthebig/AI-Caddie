import { z } from 'zod'

export const OTT_MISS_DIRECTIONS = ['LEFT', 'HIT', 'RIGHT'] as const
export const APP_MISS_DIRECTIONS = ['LEFT', 'RIGHT', 'SHORT', 'LONG'] as const
export const HOLE_COUNTS = [9, 18] as const

export type OttMissDirection = (typeof OTT_MISS_DIRECTIONS)[number]
export type AppMissDirection = (typeof APP_MISS_DIRECTIONS)[number]
export type HoleCount = (typeof HOLE_COUNTS)[number]

export const holeInputSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(5).optional(),
  yardage: z.number().int().min(50).max(700).optional(),
  score: z.number().int().min(1).max(15),
  putts: z.number().int().min(0).max(10),
  penaltyStrokes: z.number().int().min(0).max(5).default(0),
  ottMissDirection: z.enum(OTT_MISS_DIRECTIONS).nullable().optional(),
  gir: z.boolean(),
  appMissDirection: z.enum(APP_MISS_DIRECTIONS).nullable().optional(),
  approachProximity: z.number().int().min(0).max(200).nullable().optional(),
  upAndDownAttempt: z.boolean().nullable().optional(),
  upAndDownSuccess: z.boolean().nullable().optional(),
  argProximity: z.number().int().min(0).max(100).nullable().optional(),
})

export const createRoundSchema = z
  .object({
    courseName: z.string().min(1),
    holeCount: z.coerce.number().pipe(z.union([z.literal(9), z.literal(18)])),
    coursePar: z.coerce.number().int().min(27).max(80).optional(),
    holes: z.array(holeInputSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.holes.length !== data.holeCount) {
      ctx.addIssue({
        code: 'custom',
        message: `Expected ${data.holeCount} holes, got ${data.holes.length}`,
        path: ['holes'],
      })
    }

    const numbers = data.holes.map((h) => h.holeNumber).sort((a, b) => a - b)
    for (let i = 0; i < data.holeCount; i++) {
      if (numbers[i] !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Holes must be numbered sequentially from 1',
          path: ['holes'],
        })
        break
      }
    }

    for (const hole of data.holes) {
      const par = hole.par ?? 4
      const isPar3 = par === 3

      if (isPar3 && hole.ottMissDirection != null) {
        ctx.addIssue({
          code: 'custom',
          message: `Hole ${hole.holeNumber}: OTT miss not applicable on par 3`,
          path: ['holes'],
        })
      }

      if (!isPar3 && hole.ottMissDirection == null) {
        ctx.addIssue({
          code: 'custom',
          message: `Hole ${hole.holeNumber}: OTT result required on par ${par}`,
          path: ['holes'],
        })
      }

      if (!hole.gir && hole.appMissDirection == null) {
        ctx.addIssue({
          code: 'custom',
          message: `Hole ${hole.holeNumber}: approach miss direction required when GIR missed`,
          path: ['holes'],
        })
      }

      if (hole.gir && hole.appMissDirection != null) {
        ctx.addIssue({
          code: 'custom',
          message: `Hole ${hole.holeNumber}: approach miss direction only when GIR missed`,
          path: ['holes'],
        })
      }
    }
  })

export type HoleInput = z.infer<typeof holeInputSchema>
export type CreateRoundInput = z.infer<typeof createRoundSchema>

export type RoundAggregates = {
  totalScore: number
  fairwaysHit: number
  fairwayOpportunities: number
  greensInReg: number
  totalPutts: number
  penaltyStrokes: number
  coursePar: number | null
}

export function emptyHole(holeNumber: number, par = 4): HoleInput {
  return {
    holeNumber,
    par,
    score: par,
    putts: 2,
    penaltyStrokes: 0,
    ottMissDirection: par === 3 ? null : 'HIT',
    gir: false,
    appMissDirection: null,
    approachProximity: null,
    upAndDownAttempt: null,
    upAndDownSuccess: null,
    argProximity: null,
  }
}
