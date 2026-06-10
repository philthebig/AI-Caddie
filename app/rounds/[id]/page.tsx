import AICoachButton from '@/components/AICoachButton'
import CoachChat from '@/components/CoachChat'
import DeleteRoundButton from '@/components/DeleteRoundButton'
import HolePickerLinks from '@/components/HolePickerLinks'
import StatPill from '@/components/StatPill'
import { getDbUser } from '@/lib/auth'
import { parseStoredCoachFeedback } from '@/lib/coach/analysis'
import { coachMessagesToUIMessages } from '@/lib/coach/messages'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'
import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ coach?: string }>
}

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

export default async function RoundDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { coach } = await searchParams
  const autoStartCoach = coach === '1'
  const dbUser = await getDbUser()
  if (!dbUser) notFound()

  const round = await prisma.round.findUnique({
    where: { id },
    include: { holes: { orderBy: { holeNumber: 'asc' } } },
  })

  if (!round || round.userId !== dbUser.id) notFound()

  const storedCoachFeedback = parseStoredCoachFeedback(round.aiFeedback)
  const legacyCoachFeedback =
    round.aiFeedback && !storedCoachFeedback ? round.aiFeedback : null

  let initialChatMessages: ReturnType<typeof coachMessagesToUIMessages> = []
  try {
    const chatHistory = await prisma.coachMessage.findMany({
      where: { roundId: id, userId: dbUser.id },
      orderBy: { createdAt: 'asc' },
    })
    initialChatMessages = coachMessagesToUIMessages(chatHistory)
  } catch {
    // CoachMessage table may be missing if migrations are pending
  }

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

        <header className="space-y-3">
          <div className="space-y-1">
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
          </div>
          {round.holes.length > 0 && (
            <Link
              href={`/rounds/${round.id}/edit`}
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 touch-manipulation"
            >
              Edit round
            </Link>
          )}
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-800">Hole by hole</h2>
              <p className="text-xs text-slate-400">Tap to edit</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <HolePickerLinks roundId={round.id} holeCount={holeCount} />
            </div>

            <div className="space-y-2">
              {round.holes.map((hole) => {
                const par = hole.par ?? 4
                const vsPar = hole.score - par
                const vsParLabel =
                  vsPar === 0 ? 'E' : vsPar > 0 ? `+${vsPar}` : String(vsPar)

                return (
                  <Link
                    key={hole.id}
                    href={`/rounds/${round.id}/edit?hole=${hole.holeNumber}`}
                    className="block bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-start hover:border-emerald-300 active:scale-[0.99] transition touch-manipulation"
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
                    <span className="text-emerald-600 text-sm font-bold shrink-0 self-center">
                      Edit
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Legacy round — only summary stats were recorded.
          </div>
        )}

        <section
          id="ai-coach"
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm scroll-mt-4"
        >
          <h2 className="text-lg font-bold text-slate-800 mb-3">AI Coach</h2>
          {autoStartCoach && !round.aiFeedback && (
            <p className="text-sm text-slate-600 mb-3">
              Round complete — your AI caddie is reviewing your stats.
            </p>
          )}
          {storedCoachFeedback ? (
            <AICoachButton
              roundId={round.id}
              initialFeedback={storedCoachFeedback}
            />
          ) : (
            <AICoachButton
              roundId={round.id}
              autoStart={autoStartCoach}
              legacyFeedback={legacyCoachFeedback}
            />
          )}

          {round.holes.length > 0 && round.status === 'COMPLETED' && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-slate-700 mb-1">Ask a follow-up</h3>
              <p className="text-xs text-slate-500 mb-3">
                Your caddie knows this round&apos;s stats — ask about patterns, practice plans, or
                specific holes.
              </p>
              <CoachChat roundId={round.id} initialMessages={initialChatMessages} />
            </div>
          )}
        </section>

        <section className="pt-2">
          <DeleteRoundButton roundId={round.id} />
        </section>
      </div>
    </main>
  )
}
