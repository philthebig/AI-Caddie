'use server'

import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import {
  createRoundSchema,
  normalizeHoles,
  type CreateRoundErrorDetails,
  type HoleInput,
} from '@/lib/types/golf'
import { revalidatePath } from 'next/cache'

export async function createRound(formData: FormData) {
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
    const details = result.error.flatten() as CreateRoundErrorDetails
    return { error: messages || 'Invalid data', details }
  }

  const { courseName, externalCourseId, teeName, holeCount, coursePar, holes } = result.data
  const aggregates = computeRoundAggregates(holes, coursePar)

  try {
    await prisma.$transaction(async (tx) => {
      const round = await tx.round.create({
        data: {
          userId: dbUser.id,
          courseName,
          externalCourseId: externalCourseId ?? null,
          teeName: teeName ?? null,
          holeCount,
          coursePar: aggregates.coursePar,
          totalScore: aggregates.totalScore,
          fairwaysHit: aggregates.fairwaysHit,
          greensInReg: aggregates.greensInReg,
          totalPutts: aggregates.totalPutts,
          penaltyStrokes: aggregates.penaltyStrokes,
        },
      })

      await tx.hole.createMany({
        data: holes.map((hole) => ({
          roundId: round.id,
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
        })),
      })
    })
  } catch (err) {
    console.error('createRound failed:', err)
    return { error: 'Could not save your round. Please try again.' }
  }

  revalidatePath('/')
  return { success: true }
}

async function parseRoundFormData(formData: FormData) {
  const holesJson = formData.get('holesJson')
  if (typeof holesJson !== 'string') {
    return { error: 'Missing hole data' as const }
  }

  let parsedHoles: unknown
  try {
    parsedHoles = JSON.parse(holesJson)
  } catch {
    return { error: 'Invalid hole data' as const }
  }

  const externalCourseIdRaw = formData.get('externalCourseId')
  const parsedExternalCourseId =
    typeof externalCourseIdRaw === 'string' && externalCourseIdRaw.trim()
      ? Number(externalCourseIdRaw)
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
    const details = result.error.flatten() as CreateRoundErrorDetails
    return { error: messages || 'Invalid data', details }
  }

  return { data: result.data }
}

export async function updateRound(roundId: string, formData: FormData) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const existing = await prisma.round.findUnique({ where: { id: roundId } })
  if (!existing || existing.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  const parsed = await parseRoundFormData(formData)
  if ('error' in parsed && !('data' in parsed)) {
    return parsed
  }
  if (!('data' in parsed) || !parsed.data) {
    return { error: 'Invalid data' }
  }

  const { courseName, externalCourseId, teeName, holeCount, coursePar, holes } = parsed.data
  const aggregates = computeRoundAggregates(holes, coursePar)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.hole.deleteMany({ where: { roundId } })
      await tx.hole.createMany({
        data: holes.map((hole) => ({
          roundId,
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
        })),
      })

      await tx.round.update({
        where: { id: roundId },
        data: {
          courseName,
          externalCourseId: externalCourseId ?? null,
          teeName: teeName ?? null,
          holeCount,
          coursePar: aggregates.coursePar,
          totalScore: aggregates.totalScore,
          fairwaysHit: aggregates.fairwaysHit,
          greensInReg: aggregates.greensInReg,
          totalPutts: aggregates.totalPutts,
          penaltyStrokes: aggregates.penaltyStrokes,
        },
      })
    })
  } catch (err) {
    console.error('updateRound failed:', err)
    return { error: 'Could not update your round. Please try again.' }
  }

  revalidatePath('/')
  revalidatePath(`/rounds/${roundId}`)
  return { success: true, roundId }
}

export async function deleteRound(roundId: string) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return { error: 'You must be logged in' }
  }

  const existing = await prisma.round.findUnique({ where: { id: roundId } })
  if (!existing || existing.userId !== dbUser.id) {
    return { error: 'Round not found' }
  }

  try {
    await prisma.round.delete({ where: { id: roundId } })
  } catch (err) {
    console.error('deleteRound failed:', err)
    return { error: 'Could not delete this round. Please try again.' }
  }

  revalidatePath('/')
  return { success: true }
}
