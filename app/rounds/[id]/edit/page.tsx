import AddRoundForm from '@/components/AddRoundForm'
import { getDbUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { holeInputFromDb, type HoleCount } from '@/lib/types/golf'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ hole?: string }>
}

export default async function EditRoundPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { hole: holeParam } = await searchParams
  const dbUser = await getDbUser()
  if (!dbUser) notFound()

  const round = await prisma.round.findUnique({
    where: { id },
    include: { holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) notFound()
  if (round.holes.length === 0) notFound()

  const holeCount = round.holeCount as HoleCount
  const startHole = holeParam ? Math.min(Math.max(Number(holeParam) - 1, 0), holeCount - 1) : 0

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 pb-24 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        <AddRoundForm
          edit={{
            roundId: round.id,
            courseName: round.courseName,
            externalCourseId: round.externalCourseId,
            teeName: round.teeName,
            holeCount,
            holes: round.holes.map(holeInputFromDb),
            startHole: Number.isFinite(startHole) ? startHole : 0,
          }}
        />
      </div>
    </main>
  )
}
