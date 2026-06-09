'use client'

import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import type { HoleInput } from '@/lib/types/golf'
import Link from 'next/link'
import { useMemo } from 'react'

type PlayRoundHeaderProps = {
  courseName: string
  teeName: string | null
  currentHole: HoleInput
  holes: HoleInput[]
  currentHoleIndex: number
  saving?: boolean
}

function formatVsPar(score: number, par: number | null): string | null {
  if (par == null) return null
  const diff = score - par
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}

export default function PlayRoundHeader({
  courseName,
  teeName,
  currentHole,
  holes,
  currentHoleIndex,
  saving = false,
}: PlayRoundHeaderProps) {
  const playedHoles = useMemo(
    () => holes.slice(0, currentHoleIndex + 1),
    [holes, currentHoleIndex]
  )

  const aggregates = useMemo(
    () => computeRoundAggregates(playedHoles),
    [playedHoles]
  )

  const scoreVsPar = formatVsPar(aggregates.totalScore, aggregates.coursePar)
  const fwLabel =
    aggregates.fairwayOpportunities > 0
      ? `${aggregates.fairwaysHit}/${aggregates.fairwayOpportunities}`
      : '—'

  return (
    <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 border-b border-emerald-800/20 bg-emerald-700 text-white shadow-md safe-top">
      <div className="px-4 sm:px-6 pt-3 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200/90 truncate">
              {courseName}
              {teeName ? ` · ${teeName}` : ''}
            </p>
            <h1 className="text-lg font-black leading-tight mt-0.5">
              Hole {currentHole.holeNumber}
              <span className="ml-2 text-sm font-semibold text-emerald-100">
                Par {currentHole.par ?? 4}
                {currentHole.yardage != null ? ` · ${currentHole.yardage} yds` : ''}
              </span>
            </h1>
          </div>
          <Link
            href="/"
            className="shrink-0 min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-emerald-800/50 text-emerald-100 hover:bg-emerald-800 text-sm font-bold touch-manipulation"
            aria-label="Exit to dashboard"
          >
            ✕
          </Link>
        </div>

        <div
          className="grid grid-cols-4 gap-1.5"
          aria-label="Running round totals"
          aria-busy={saving}
        >
          <div className="rounded-lg bg-emerald-800/40 px-2 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
              Score
            </p>
            <p className="text-xl font-black leading-none mt-0.5">
              {aggregates.totalScore}
            </p>
            {scoreVsPar != null && (
              <p className="text-[10px] font-semibold text-emerald-200/90 mt-0.5">
                {scoreVsPar}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-emerald-800/40 px-2 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
              GIR
            </p>
            <p className="text-xl font-black leading-none mt-0.5">
              {aggregates.greensInReg}
            </p>
            <p className="text-[10px] font-semibold text-emerald-200/90 mt-0.5">
              of {playedHoles.length}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-800/40 px-2 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
              FW
            </p>
            <p className="text-xl font-black leading-none mt-0.5">{fwLabel}</p>
          </div>
          <div className="rounded-lg bg-emerald-800/40 px-2 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200/80">
              Putts
            </p>
            <p className="text-xl font-black leading-none mt-0.5">
              {aggregates.totalPutts}
            </p>
          </div>
        </div>

        {saving && (
          <p className="text-center text-xs font-semibold text-emerald-100 animate-pulse-text" aria-live="polite">
            Saving hole…
          </p>
        )}
      </div>
    </header>
  )
}
