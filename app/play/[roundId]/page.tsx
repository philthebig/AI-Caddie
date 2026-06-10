import PlayRoundClient from '@/components/PlayRoundClient'
import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveCourseGps } from '@/lib/golf-course-gps/resolve'
import { holeInputFromDb, type HoleCount } from '@/lib/types/golf'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

type PageProps = { params: Promise<{ roundId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roundId } = await params
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { courseName: true, status: true },
  })
  if (!round || round.status !== 'IN_PROGRESS') {
    return { title: 'Play round' }
  }
  return { title: `Playing · ${round.courseName}` }
}

export default async function PlayRoundPage({ params }: PageProps) {
  const { roundId } = await params
  const dbUser = await getDbUser()
  if (!dbUser) notFound()

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) notFound()

  if (round.status === 'COMPLETED') {
    redirect(`/rounds/${roundId}`)
  }

  const initialHoles = round.holes.map(holeInputFromDb)
  const initialSavedHoleIndices = round.holes
    .filter((hole) => hole.touched)
    .map((hole) => hole.holeNumber - 1)

  const gpsResult = await resolveCourseGps(
    {
      externalCourseId: round.externalCourseId,
      courseName: round.courseName,
      latitude: round.courseLatitude,
      longitude: round.courseLongitude,
      holeCount: round.holeCount,
    },
    { cacheOnly: true }
  )

  return (
    <main className="mx-auto max-w-2xl w-full">
      <PlayRoundClient
        roundId={round.id}
        courseName={round.courseName}
        teeName={round.teeName}
        courseLatitude={round.courseLatitude}
        courseLongitude={round.courseLongitude}
        holeCount={round.holeCount as HoleCount}
        initialHoles={initialHoles}
        initialSavedHoleIndices={initialSavedHoleIndices}
        initialCourseGps={gpsResult.payload}
        initialGpsSource={gpsResult.source}
      />
    </main>
  )
}
