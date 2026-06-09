import CancelRoundButton from '@/components/CancelRoundButton'
import Link from 'next/link'

type ResumeRoundBannerProps = {
  round: {
    id: string
    courseName: string
    teeName: string | null
    holeCount: number
    totalScore: number
    coursePar: number | null
  }
}

export default function ResumeRoundBanner({ round }: ResumeRoundBannerProps) {
  const scoreVsPar =
    round.coursePar != null ? round.totalScore - round.coursePar : null

  return (
    <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Round in progress
          </p>
          <h2 className="text-lg font-bold text-slate-800 truncate mt-0.5">
            {round.courseName}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {round.teeName && `${round.teeName} tees · `}
            {round.holeCount} holes
            {scoreVsPar != null && (
              <span>
                {' · '}
                {round.totalScore} ({scoreVsPar >= 0 ? '+' : ''}
                {scoreVsPar} thru saved holes)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <Link
            href={`/play/${round.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 min-h-12 font-bold text-white hover:bg-emerald-700 touch-manipulation"
          >
            Resume round →
          </Link>
          <CancelRoundButton roundId={round.id} variant="banner" />
        </div>
      </div>
    </div>
  )
}
