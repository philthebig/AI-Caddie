'use server'

import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  courseGpsPayloadSchema,
  type CourseGpsPayload,
  type HoleGps,
} from '@/lib/golf-course-gps/types'
import { resolveCourseGps, saveManualCourseGps } from '@/lib/golf-course-gps/resolve'

function roundGpsContext(round: {
  externalCourseId: number | null
  courseName: string
  courseLatitude: number | null
  courseLongitude: number | null
  holeCount: number
}) {
  return {
    externalCourseId: round.externalCourseId,
    courseName: round.courseName,
    latitude: round.courseLatitude,
    longitude: round.courseLongitude,
    holeCount: round.holeCount,
  }
}

export async function fetchCourseGpsForRound(roundId: string, forceRefresh = false) {
  const dbUser = await getDbUser()
  if (!dbUser) return { error: 'You must be logged in' }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  const result = await resolveCourseGps(roundGpsContext(round), { forceRefresh })
  return {
    payload: result.payload,
    source: result.source,
    fromCache: result.fromCache,
  }
}

export async function saveCourseGpsCalibration(
  roundId: string,
  holes: HoleGps[],
  holeCount: number
) {
  const dbUser = await getDbUser()
  if (!dbUser) return { error: 'You must be logged in' }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'IN_PROGRESS') {
    return { error: 'GPS calibration is only available during live play' }
  }

  const payload: CourseGpsPayload = {
    holes,
    holeCount,
    source: 'manual',
  }

  const validated = courseGpsPayloadSchema.safeParse(payload)
  if (!validated.success) {
    return { error: 'Invalid GPS data' }
  }

  if (validated.data.holes.length < Math.min(9, holeCount)) {
    return {
      error: `Mark at least ${Math.min(9, holeCount)} holes (tee + green) before saving.`,
    }
  }

  const result = await saveManualCourseGps(roundGpsContext(round), {
    holes: validated.data.holes,
    holeCount: validated.data.holeCount,
  })

  return {
    payload: result.payload,
    source: result.source,
  }
}
