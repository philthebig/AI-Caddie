import AICoachButton from '@/components/AICoachButton'
import StatPill from '@/components/StatPill'
import { getDbUser } from '@/lib/auth'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const round = await prisma.round.findUnique({ where: { id }, select: { courseName: true } })
  return {
    title: round?.courseName ?? 'Round',
  }
}

function formatSg(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`
}

export default async function RoundDetailPage({ params }: PageProps) {
  const { id } = await params
  const dbUser = await getDbUser()
  if (!dbUser) notFound()

  const round = await prisma.round.findUnique({
    where: { id },
    include: { holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) notFound()

  const aggregates = computeRoundAggregates(round.holes, round.coursePar)
  const holeCount = round.holes.length > 0 ? round.holes.length : round.holeCount
  const scoreVsPar =
    aggregates.coursePar != null ? aggregates.totalScore - aggregates.coursePar : null
  const girPct =
    holeCount > 0 ? Math.round((aggregates.greensInReg / holeCount) * 100) : null
  const fwPct =
    aggregates.fairwayOpportunities > 0
      ? Math.round((aggregates.fairwaysHit / aggregates.fairwayOpportunities) * 100)
      : null

  const sg = round.holes.length > 0 ? computeRoundStrokesGained(round.holes) : null

  return (
    <main className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 min-h-11"
        >
          ← Dashboard
        </Link>

        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-800">
            {round.courseName}
          </h1>
          <p className="text-sm text-slate-500">
            {new Date(round.date).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {round.teeName && <span> · {round.teeName} tees</span>}
            {aggregates.coursePar != null && <span> · Par {aggregates.coursePar}</span>}
          </p>
        </header>

        <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total score</p>
            <p className="text-5xl font-black text-emerald-700 leading-none mt-1">
              {round.totalScore}
            </p>
            {scoreVsPar != null && (
              <p className="text-sm font-semibold text-slate-500 mt-1">
                {scoreVsPar >= 0 ? '+' : ''}
                {scoreVsPar} vs par
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatPill
            label="Fairways"
            value={aggregates.fairwaysHit}
            sub={fwPct != null ? `${fwPct}%` : undefined}
          />
          <StatPill
            label="GIR"
            value={aggregates.greensInReg}
            sub={girPct != null ? `${girPct}%` : undefined}
          />
          <StatPill label="Putts" value={aggregates.totalPutts} />
          <StatPill label="Penalties" value={aggregates.penaltyStrokes} />
        </div>

        {sg && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Strokes gained
            </h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['OTT', sg.ott],
                  ['APP', sg.app],
                  ['ARG', sg.arg],
                  ['PUTT', sg.putt],
                ] as const
              ).map(([cat, val]) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${
                    val >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {cat} {formatSg(val)}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black bg-slate-100 text-slate-800 border border-slate-200">
                Total {formatSg(sg.total)}
              </span>
            </div>
          </section>
        )}

        {round.holes.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800">Hole by hole</h2>
            <div className="space-y-2">
              {round.holes.map((hole) => {
                const par = hole.par ?? 4
                const vsPar = hole.score - par
                const vsParLabel =
                  vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : String(vsPar)

                return (
                  <div
                    key={hole.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-start"
                  >
                    <div className="shrink-0 w-10 text-center">
                      <div className="text-xs font-bold text-slate-400">H{hole.holeNumber}</div>
                      <div className="text-sm font-semibold text-slate-600">P{par}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-800">{hole.score}</span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            vsPar <= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {vsParLabel}
                        </span>
                        <span className="text-sm text-slate-500">{hole.putts} putts</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {hole.yardage != null && <span>{hole.yardage} yds</span>}
                        {hole.ottMissDirection != null && (
                          <span>
                            OTT:{' '}
                            {hole.ottMissDirection === 'HIT'
                              ? 'Fairway'
                              : hole.ottMissDirection.toLowerCase()}
                          </span>
                        )}
                        {hole.gir ? (
                          <span className="text-emerald-600 font-semibold">GIR</span>
                        ) : (
                          <span>Miss: {hole.appMissDirection?.toLowerCase()}</span>
                        )}
                        {hole.upAndDownAttempt && (
                          <span>
                            U&D: {hole.upAndDownSuccess ? 'saved' : 'missed'}
                          </span>
                        )}
                        {hole.penaltyStrokes > 0 && (
                          <span className="text-red-600">+{hole.penaltyStrokes} pen</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Legacy round — only summary stats were recorded.
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3">AI Coach</h2>
          {round.aiFeedback ? (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
              <p className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap">
                {round.aiFeedback}
              </p>
            </div>
          ) : (
            <AICoachButton roundId={round.id} />
          )}
        </section>
      </div>
    </main>
  )
}
