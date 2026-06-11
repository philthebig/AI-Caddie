import Link from 'next/link'
import type { Hole, Round } from '@prisma/client'
import SgChips from '@/components/SgChips'
import { getCoachDisplaySummary } from '@/lib/coach/analysis'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'

type RoundCardProps = {
  round: Round & { holes: Hole[] }
}

export default function RoundCard({ round }: RoundCardProps) {
  const holeCount = round.holes.length > 0 ? round.holes.length : round.holeCount
  const scoreVsPar =
    round.coursePar != null ? round.totalScore - round.coursePar : null
  const sg = round.holes.length > 0 ? computeRoundStrokesGained(round.holes) : null

  return (
    <Link
      href={`/rounds/${round.id}`}
      className="block bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-slate-800 truncate">{round.courseName}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mt-0.5">
            {new Date(round.date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {round.teeName && (
              <span className="ml-2 text-slate-500 normal-case">{round.teeName} tees</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-3xl font-black text-emerald-700 leading-none">
            {round.totalScore}
          </span>
          {scoreVsPar != null && (
            <span className="text-xs font-semibold text-slate-500 mt-0.5">
              {scoreVsPar >= 0 ? '+' : ''}
              {scoreVsPar} vs par
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm mt-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">FW</div>
          <div className="font-bold text-slate-700">{round.fairwaysHit}</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">GIR</div>
          <div className="font-bold text-slate-700">{round.greensInReg}</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Putts</div>
          <div className="font-bold text-slate-700">{round.totalPutts}</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Holes</div>
          <div className="font-bold text-slate-700">{holeCount}</div>
        </div>
      </div>

      {sg && (
        <div className="mt-3">
          <SgChips sg={sg} showTotal={false} size="sm" />
        </div>
      )}

      {round.aiFeedback && (
        <p className="mt-3 text-sm text-indigo-700 line-clamp-2 leading-snug">
          {getCoachDisplaySummary(round.aiFeedback)}
        </p>
      )}

      <p className="mt-3 text-sm font-semibold text-emerald-700">View round →</p>
    </Link>
  )
}
