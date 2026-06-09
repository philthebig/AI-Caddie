import type { HoleInput } from '@/lib/types/golf'

/** Map validated hole input to Prisma create/update fields. */
export function holeInputToPrismaData(hole: HoleInput) {
  return {
    holeNumber: hole.holeNumber,
    par: hole.par ?? null,
    yardage: hole.yardage ?? null,
    score: hole.score,
    putts: hole.putts,
    penaltyStrokes: hole.penaltyStrokes,
    ottMissDirection: hole.ottMissDirection ?? null,
    gir: hole.gir,
    appMissDirection: hole.gir ? null : (hole.appMissDirection ?? null),
    approachProximity: hole.gir ? null : (hole.approachProximity ?? null),
    upAndDownAttempt: hole.gir ? null : (hole.upAndDownAttempt ?? null),
    upAndDownSuccess: hole.gir ? null : (hole.upAndDownSuccess ?? null),
    argProximity: hole.gir ? null : (hole.argProximity ?? null),
  }
}
