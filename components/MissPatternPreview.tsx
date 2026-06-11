'use client'

import SgChips from '@/components/SgChips'
import type { HoleInput } from '@/lib/types/golf'
import { normalizeHoles } from '@/lib/types/golf'
import { computeMissPatterns } from '@/lib/golf-logic/miss-patterns'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'
import { useMemo } from 'react'

type MissPatternPreviewProps = {
  holes: HoleInput[]
}

export default function MissPatternPreview({ holes }: MissPatternPreviewProps) {
  const normalized = useMemo(() => normalizeHoles(holes), [holes])

  const { sg, patterns } = useMemo(() => {
    const sg = computeRoundStrokesGained(normalized)
    const patterns = computeMissPatterns(normalized)
    return { sg, patterns }
  }, [normalized])

  const topOtt = patterns.ott.segments[0]
  const topApp = patterns.app.segments[0]
  const shortSided = patterns.app.shortSided
  const blowUps = patterns.blowUps.slice(0, 2)

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 mb-2">
          Round preview — strokes gained
        </p>
        <SgChips sg={sg} size="sm" />
      </div>

      {(topOtt || topApp || shortSided.count > 0 || blowUps.length > 0) && (
        <div className="space-y-1.5 text-xs text-indigo-900">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
            Miss patterns
          </p>
          {topOtt && (
            <p>
              <span className="font-semibold">OTT:</span> {topOtt.label} ({topOtt.count} of{' '}
              {topOtt.opportunities})
            </p>
          )}
          {topApp && (
            <p>
              <span className="font-semibold">APP:</span> {topApp.label} ({topApp.count} of{' '}
              {topApp.opportunities})
            </p>
          )}
          {shortSided.count > 0 && (
            <p>
              <span className="font-semibold">Short-sided:</span> {shortSided.count} hole
              {shortSided.count === 1 ? '' : 's'} (H
              {shortSided.holes.join(', H')})
            </p>
          )}
          {blowUps.map((b) => (
            <p key={b.holeNumber}>
              <span className="font-semibold">Blow-up H{b.holeNumber}:</span> {b.score} on par{' '}
              {b.par} (+{b.vsPar}) — {b.primaryCause}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
