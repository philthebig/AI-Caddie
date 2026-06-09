import { prisma } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import AddRoundForm from '@/components/AddRoundForm'
import EmptyState from '@/components/EmptyState'
import RoundCard from '@/components/RoundCard'
import TrendsChart from '@/components/TrendsChart'
import { buildTrendSeries, computeTrendPoints } from '@/lib/golf-logic/trends'

export default async function Home() {
  const user = await currentUser()
  if (!user) return <div>Please Sign In</div>

  const dbUser = await prisma.user.findUnique({
    where: { email: user.emailAddresses[0].emailAddress },
    include: {
      rounds: {
        orderBy: { date: 'desc' },
        include: { holes: { orderBy: { holeNumber: 'asc' } } },
      },
    },
  })

  if (!dbUser) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 font-sans text-slate-900 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <header>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800">
              Welcome, {user.firstName}!
            </h1>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">
              Log your first round to unlock AI coaching and trend tracking.
            </p>
          </header>
          <AddRoundForm />
        </div>
      </main>
    )
  }

  const trendPoints = computeTrendPoints(dbUser.rounds)
  const trendSeries = buildTrendSeries(trendPoints)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 font-sans text-slate-900 pb-24">
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800">
            {dbUser.name ? `${dbUser.name}'s Dashboard` : 'Your Dashboard'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {dbUser.rounds.length === 0
              ? 'No rounds yet'
              : `${dbUser.rounds.length} round${dbUser.rounds.length === 1 ? '' : 's'} logged`}
          </p>
        </header>

        {dbUser.rounds.length >= 1 && <TrendsChart series={trendSeries} />}

        <AddRoundForm />

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">Recent rounds</h2>
          {dbUser.rounds.length === 0 ? (
            <EmptyState
              icon="🏌️‍♂️"
              title="No rounds yet"
              description="Head to the course, log your stats hole-by-hole, and your trends will show up here."
            />
          ) : (
            <div className="grid gap-3">
              {dbUser.rounds.map((round) => (
                <RoundCard key={round.id} round={round} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
