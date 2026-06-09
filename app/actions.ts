'use server'

import { prisma } from '@/lib/db'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import { createRoundSchema, normalizeHoles, type HoleInput } from '@/lib/types/golf'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function createRound(formData: FormData) {
  const user = await currentUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  let dbUser = await prisma.user.findUnique({
    where: { email: user.emailAddresses[0].emailAddress },
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        id: user.id,
      },
    })
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
    return { error: messages || 'Invalid data', details: result.error.flatten() }
  }

  const { courseName, externalCourseId, teeName, holeCount, coursePar, holes } = result.data
  const aggregates = computeRoundAggregates(holes, coursePar)

  await prisma.$transaction(async (tx) => {
    const round = await tx.round.create({
      data: {
        userId: dbUser!.id,
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

  revalidatePath('/')
  return { success: true }
}
