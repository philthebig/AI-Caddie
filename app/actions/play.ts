'use server'

import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import { holeInputToPrismaData } from '@/lib/golf-logic/hole-persistence'
import {
  createRoundSchema,
  normalizeHoles,
  saveHoleSchema,
  type HoleInput,
} from '@/lib/types/golf'
import { revalidatePath } from 'next/cache'

export async function startRound(formData: FormData) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const holesJson = formData.get('holesJson')
  if (typeof holesJson !== 'string') {
    return { error: 'Missing hole data' }
  }

  let parsedHoles: unknown
  try {
    parsedHoles = JSON.parse(holesJson)
  } catch {
    return { error: 'Invalid hole data' }
  }

  const externalCourseIdRaw = formData.get('externalCourseId')
  const parsedExternalCourseId =
    typeof externalCourseIdRaw === 'string' && externalCourseIdRaw.trim()
      ? Number(externalCourseIdRaw)
      : undefined

  const courseLatitudeRaw = formData.get('courseLatitude')
  const courseLongitudeRaw = formData.get('courseLongitude')
  const parsedLatitude =
    typeof courseLatitudeRaw === 'string' && courseLatitudeRaw.trim()
      ? Number(courseLatitudeRaw)
      : undefined
  const parsedLongitude =
    typeof courseLongitudeRaw === 'string' && courseLongitudeRaw.trim()
      ? Number(courseLongitudeRaw)
      : undefined

  const courseLatitude =
    parsedLatitude != null &&
    Number.isFinite(parsedLatitude) &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90
      ? parsedLatitude
      : undefined
  const courseLongitude =
    parsedLongitude != null &&
    Number.isFinite(parsedLongitude) &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
      ? parsedLongitude
      : undefined

  const rawData = {
    courseName: formData.get('courseName'),
    externalCourseId: Number.isFinite(parsedExternalCourseId) ? parsedExternalCourseId : undefined,
    teeName: formData.get('teeName') || undefined,
    holeCount: formData.get('holeCount'),
    coursePar: formData.get('coursePar') || undefined,
    holes: normalizeHoles(parsedHoles as HoleInput[]),
  }

  const result = createRoundSchema.safeParse(rawData)
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join('; ')
    return { error: messages || 'Invalid data' }
  }

  const { courseName, externalCourseId, teeName, holeCount, coursePar, holes } = result.data
  const aggregates = computeRoundAggregates(holes, coursePar)

  try {
    const round = await prisma.$transaction(async (tx) => {
      const created = await tx.round.create({
        data: {
          userId: dbUser.id,
          courseName,
          externalCourseId: externalCourseId ?? null,
          courseLatitude: courseLatitude ?? null,
          courseLongitude: courseLongitude ?? null,
          teeName: teeName ?? null,
          holeCount,
          coursePar: aggregates.coursePar,
          totalScore: aggregates.totalScore,
          fairwaysHit: aggregates.fairwaysHit,
          greensInReg: aggregates.greensInReg,
          totalPutts: aggregates.totalPutts,
          penaltyStrokes: aggregates.penaltyStrokes,
          status: 'IN_PROGRESS',
        },
      })

      await tx.hole.createMany({
        data: holes.map((hole) => ({
          roundId: created.id,
          ...holeInputToPrismaData(hole),
        })),
      })

      return created
    })

    revalidatePath('/')
    return { roundId: round.id }
  } catch (err) {
    console.error('startRound failed:', err)
    if (process.env.NODE_ENV === 'development' && err instanceof Error) {
      return { error: `Could not start your round: ${err.message}` }
    }
    return { error: 'Could not start your round. Please try again.' }
  }
}

export async function saveHole(roundId: string, holeNumber: number, holeData: HoleInput) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'IN_PROGRESS') {
    return { error: 'This round is already finished' }
  }

  if (holeNumber < 1 || holeNumber > round.holeCount) {
    return { error: 'Invalid hole number' }
  }

  const normalized = normalizeHoles([{ ...holeData, holeNumber }])[0]
  const validated = saveHoleSchema.safeParse(normalized)
  if (!validated.success) {
    const messages = validated.error.issues.map((i) => i.message).join('; ')
    return { error: messages || 'Invalid hole data' }
  }

  const hole = validated.data
  const prismaData = holeInputToPrismaData(hole)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.hole.update({
        where: {
          roundId_holeNumber: { roundId, holeNumber },
        },
        data: { ...prismaData, touched: true },
      })

      const allHoles = round.holes.map((h) =>
        h.holeNumber === holeNumber ? { ...h, ...prismaData } : h
      )
      const aggregates = computeRoundAggregates(allHoles, round.coursePar)

      await tx.round.update({
        where: { id: roundId },
        data: {
          totalScore: aggregates.totalScore,
          fairwaysHit: aggregates.fairwaysHit,
          greensInReg: aggregates.greensInReg,
          totalPutts: aggregates.totalPutts,
          penaltyStrokes: aggregates.penaltyStrokes,
          coursePar: aggregates.coursePar,
        },
      })
    })
  } catch (err) {
    console.error('saveHole failed:', err)
    return { error: 'Could not save this hole. Please try again.' }
  }

  revalidatePath(`/play/${roundId}`)
  revalidatePath('/')
  return { success: true }
}

/**
 * Mark an in-progress round complete. Partial rounds are allowed — aggregates
 * reflect whatever holes have been saved; untouched stubs remain at defaults.
 */
export async function finishRound(roundId: string) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'IN_PROGRESS') {
    return { error: 'This round is already finished' }
  }

  try {
    await prisma.round.update({
      where: { id: roundId },
      data: { status: 'COMPLETED' },
    })
  } catch (err) {
    console.error('finishRound failed:', err)
    return { error: 'Could not finish your round. Please try again.' }
  }

  revalidatePath('/')
  revalidatePath(`/rounds/${roundId}`)
  revalidatePath(`/play/${roundId}`)
  return { success: true, roundId }
}

/** Delete an in-progress round without saving it as completed. */
export async function cancelRound(roundId: string) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round || round.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  if (round.status !== 'IN_PROGRESS') {
    return { error: 'Only in-progress rounds can be cancelled' }
  }

  try {
    await prisma.round.delete({ where: { id: roundId } })
  } catch (err) {
    console.error('cancelRound failed:', err)
    return { error: 'Could not cancel this round. Please try again.' }
  }

  revalidatePath('/')
  revalidatePath(`/play/${roundId}`)
  return { success: true }
}
