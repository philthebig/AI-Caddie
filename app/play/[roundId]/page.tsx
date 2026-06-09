import PlayRoundClient from '@/components/PlayRoundClient'
import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 font-sans text-slate-900 pb-24">
      <div className="max-w-2xl mx-auto">
        <PlayRoundClient
          roundId={round.id}
          courseName={round.courseName}
          teeName={round.teeName}
          holeCount={round.holeCount as HoleCount}
          initialHoles={initialHoles}
        />
      </div>
    </main>
  )
}
