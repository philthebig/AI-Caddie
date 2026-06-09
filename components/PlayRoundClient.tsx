'use client'

import { finishRound, saveHole } from '@/app/actions/play'
import CancelRoundButton from '@/components/CancelRoundButton'
import DistanceReadout from '@/components/DistanceReadout'
import HoleNavBar from '@/components/HoleNavBar'
import HoleScoreCard from '@/components/HoleScoreCard'
import PlayRoundHeader from '@/components/PlayRoundHeader'
import type { HoleCount, HoleInput } from '@/lib/types/golf'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

function playHoleStorageKey(roundId: string) {
  return `aicaddie-play-hole-${roundId}`
}

function playCompletedStorageKey(roundId: string) {
  return `aicaddie-play-completed-${roundId}`
}

function loadStoredHole(roundId: string, holeCount: number): number {
  if (typeof window === 'undefined') return 0
  try {
    const saved = localStorage.getItem(playHoleStorageKey(roundId))
    if (saved != null) {
      const idx = Number(saved)
      if (Number.isInteger(idx) && idx >= 0 && idx < holeCount) return idx
    }
  } catch {
    // ignore
  }
  return 0
}

function loadCompletedHoles(roundId: string): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(playCompletedStorageKey(roundId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as number[]
    return new Set(parsed.filter((n) => Number.isInteger(n)))
  } catch {
    return new Set()
  }
}

type PlayRoundClientProps = {
  roundId: string
  courseName: string
  teeName: string | null
  courseLatitude: number | null
  courseLongitude: number | null
  holeCount: HoleCount
  initialHoles: HoleInput[]
  /** Hole indices (0-based) already saved during this live round. */
  initialSavedHoleIndices?: number[]
}

export default function PlayRoundClient({
  roundId,
  courseName,
  teeName,
  courseLatitude,
  courseLongitude,
  holeCount,
  initialHoles,
  initialSavedHoleIndices = [],
}: PlayRoundClientProps) {
  const router = useRouter()
  const [holes, setHoles] = useState<HoleInput[]>(initialHoles)
  const [currentHole, setCurrentHole] = useState(() => loadStoredHole(roundId, holeCount))
  const [completedHoles, setCompletedHoles] = useState<Set<number>>(() => {
    const merged = new Set(loadCompletedHoles(roundId))
    for (const index of initialSavedHoleIndices) {
      if (index >= 0 && index < holeCount) merged.add(index)
    }
    return merged
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    localStorage.setItem(playHoleStorageKey(roundId), String(currentHole))
  }, [roundId, currentHole])

  useEffect(() => {
    localStorage.setItem(
      playCompletedStorageKey(roundId),
      JSON.stringify([...completedHoles])
    )
  }, [roundId, completedHoles])

  const activeHoles = useMemo(() => holes.slice(0, holeCount), [holes, holeCount])
  const hole = activeHoles[currentHole]

  const updateHole = useCallback((index: number, patch: Partial<HoleInput>) => {
    setHoles((prev) => {
      const next = [...prev]
      const current = { ...next[index], ...patch }

      if (patch.par === 3) {
        current.ottMissDirection = null
      } else if (patch.par != null && patch.par >= 4 && current.ottMissDirection == null) {
        current.ottMissDirection = 'HIT'
      }

      if (patch.gir === true) {
        current.appMissDirection = null
        current.approachProximity = null
        current.upAndDownAttempt = null
        current.upAndDownSuccess = null
        current.argProximity = null
      }

      if (patch.gir === false && current.appMissDirection == null) {
        current.appMissDirection = 'SHORT'
      }

      next[index] = current
      return next
    })
    setError(null)
  }, [])

  async function persistCurrentHole() {
    if (!hole) return { error: 'No hole selected' }
    setSaving(true)
    setError(null)
    const result = await saveHole(roundId, hole.holeNumber, hole)
    setSaving(false)
    return result
  }

  async function handleNext() {
    if (saving) return
    const result = await persistCurrentHole()
    if (result?.error) {
      setError(result.error)
      return
    }
    setCompletedHoles((prev) => new Set(prev).add(currentHole))
    if (currentHole < holeCount - 1) {
      setCurrentHole((h) => h + 1)
    }
  }

  async function handleFinish() {
    if (saving) return
    const saveResult = await persistCurrentHole()
    if (saveResult?.error) {
      setError(saveResult.error)
      return
    }

    setSaving(true)
    const finishResult = await finishRound(roundId)
    setSaving(false)

    if (finishResult?.error) {
      setError(finishResult.error)
      return
    }

    localStorage.removeItem(playHoleStorageKey(roundId))
    localStorage.removeItem(playCompletedStorageKey(roundId))
    router.push(`/rounds/${roundId}`)
    router.refresh()
  }

  function goToHole(index: number) {
    setCurrentHole(index)
    setPickerOpen(false)
    setError(null)
  }

  function goPrevHole() {
    if (currentHole > 0) setCurrentHole((h) => h - 1)
    setError(null)
  }

  if (!hole) {
    return (
      <p className="px-4 py-8 text-sm text-slate-500">No hole data for this round.</p>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PlayRoundHeader
        courseName={courseName}
        teeName={teeName}
        currentHole={hole}
        holes={activeHoles}
        currentHoleIndex={currentHole}
        saving={saving}
      />

      <div className="flex-1 px-4 sm:px-6 pt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] space-y-4">
        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start justify-between gap-3"
            role="alert"
            aria-live="assertive"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 min-h-8 min-w-8 rounded-lg text-red-600 hover:bg-red-100 font-bold touch-manipulation"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <DistanceReadout
          holeYardage={hole.yardage}
          courseLatitude={courseLatitude}
          courseLongitude={courseLongitude}
        />

        <HoleScoreCard hole={hole} onUpdate={(patch) => updateHole(currentHole, patch)} />

        <div className="pt-2 border-t border-slate-200">
          <CancelRoundButton roundId={roundId} />
        </div>
      </div>

      <HoleNavBar
        currentHole={currentHole}
        holeCount={holeCount}
        completedHoles={completedHoles}
        onSelectHole={goToHole}
        onPrev={goPrevHole}
        onNext={handleNext}
        onReview={handleFinish}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((o) => !o)}
        disabled={saving}
      />
    </div>
  )
}
