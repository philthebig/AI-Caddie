'use client'

import { saveCourseGpsCalibration } from '@/app/actions/course-gps'
import type { GeolocationState } from '@/hooks/useGeolocation'
import { estimateGreenExtentsFromCenter } from '@/lib/golf-course-gps/green-extents'
import type { CourseGpsPayload, HoleGps, LatLng } from '@/lib/golf-course-gps/types'
import { useCallback, useMemo, useState } from 'react'

type DraftHole = {
  tee?: LatLng
  greenCenter?: LatLng
  greenFront?: LatLng
  greenBack?: LatLng
}

type CourseGpsCalibrationProps = {
  roundId: string
  holeCount: number
  initialPayload: CourseGpsPayload | null
  geo: Pick<GeolocationState, 'latitude' | 'longitude' | 'loading' | 'error' | 'requestLocation' | 'active'>
  onSaved: (payload: CourseGpsPayload) => void
  onClose: () => void
}

function draftFromPayload(payload: CourseGpsPayload | null): Record<number, DraftHole> {
  const drafts: Record<number, DraftHole> = {}
  if (!payload) return drafts
  for (const hole of payload.holes) {
    drafts[hole.holeNumber] = {
      tee: hole.tee,
      greenCenter: hole.green.center,
      greenFront: hole.green.front,
      greenBack: hole.green.back,
    }
  }
  return drafts
}

function draftToHoleGps(holeNumber: number, draft: DraftHole): HoleGps | null {
  if (!draft.tee || !draft.greenCenter) return null
  const green =
    draft.greenFront && draft.greenBack
      ? {
          front: draft.greenFront,
          center: draft.greenCenter,
          back: draft.greenBack,
        }
      : estimateGreenExtentsFromCenter(draft.tee, draft.greenCenter)
  return { holeNumber, tee: draft.tee, green }
}

export default function CourseGpsCalibration({
  roundId,
  holeCount,
  initialPayload,
  geo,
  onSaved,
  onClose,
}: CourseGpsCalibrationProps) {
  const [calibrationHole, setCalibrationHole] = useState(1)
  const [drafts, setDrafts] = useState<Record<number, DraftHole>>(() =>
    draftFromPayload(initialPayload)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentDraft = drafts[calibrationHole] ?? {}
  const hasPosition = geo.latitude != null && geo.longitude != null

  const completedCount = useMemo(() => {
    return Object.values(drafts).filter((d) => d.tee && d.greenCenter).length
  }, [drafts])

  const markAtMyLocation = useCallback(
    (field: keyof DraftHole) => {
      if (!hasPosition) {
        setError('Enable location first, then stand at the spot you want to mark.')
        return
      }
      const point: LatLng = {
        latitude: geo.latitude!,
        longitude: geo.longitude!,
      }
      setDrafts((prev) => ({
        ...prev,
        [calibrationHole]: { ...prev[calibrationHole], [field]: point },
      }))
      setError(null)
    },
    [calibrationHole, geo.latitude, geo.longitude, hasPosition]
  )

  async function handleSave() {
    const holes: HoleGps[] = []
    for (let n = 1; n <= holeCount; n++) {
      const hole = draftToHoleGps(n, drafts[n] ?? {})
      if (hole) holes.push(hole)
    }

    setSaving(true)
    setError(null)
    const result = await saveCourseGpsCalibration(roundId, holes, holeCount)
    setSaving(false)

    if ('error' in result && result.error) {
      setError(result.error)
      return
    }

    if (result.payload) {
      onSaved(result.payload)
      onClose()
    }
  }

  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4 space-y-4"
      aria-label="GPS calibration"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-amber-950">Calibrate hole GPS</h2>
          <p className="mt-1 text-xs text-amber-900/80 leading-relaxed">
            Stand on each spot, then tap to save tee and green positions. Start with your home
            course — data is saved for everyone who plays here. Optional front/back pins improve
            green depth readouts.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-amber-800 hover:text-amber-950 font-bold min-h-8 min-w-8 touch-manipulation"
          aria-label="Close calibration"
        >
          ✕
        </button>
      </div>

      {!geo.active && (
        <button
          type="button"
          onClick={geo.requestLocation}
          className="w-full rounded-lg bg-amber-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 touch-manipulation min-h-11"
        >
          Enable location for calibration
        </button>
      )}

      {geo.loading && (
        <p className="text-sm text-amber-900/70">Getting your position…</p>
      )}

      {geo.error && (
        <p className="text-sm text-red-700">{geo.error}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={calibrationHole <= 1}
          onClick={() => setCalibrationHole((h) => Math.max(1, h - 1))}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950 disabled:opacity-40 touch-manipulation min-h-10"
        >
          Prev hole
        </button>
        <span className="text-sm font-bold text-amber-950 tabular-nums">
          Hole {calibrationHole} / {holeCount}
        </span>
        <button
          type="button"
          disabled={calibrationHole >= holeCount}
          onClick={() => setCalibrationHole((h) => Math.min(holeCount, h + 1))}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950 disabled:opacity-40 touch-manipulation min-h-10"
        >
          Next hole
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MarkButton
          label="Mark tee here"
          done={Boolean(currentDraft.tee)}
          onClick={() => markAtMyLocation('tee')}
          disabled={!geo.active}
        />
        <MarkButton
          label="Mark green center"
          done={Boolean(currentDraft.greenCenter)}
          onClick={() => markAtMyLocation('greenCenter')}
          disabled={!geo.active}
        />
        <MarkButton
          label="Mark green front (optional)"
          done={Boolean(currentDraft.greenFront)}
          onClick={() => markAtMyLocation('greenFront')}
          disabled={!geo.active}
          subtle
        />
        <MarkButton
          label="Mark green back (optional)"
          done={Boolean(currentDraft.greenBack)}
          onClick={() => markAtMyLocation('greenBack')}
          disabled={!geo.active}
          subtle
        />
      </div>

      <p className="text-xs text-amber-900/70">
        {completedCount} of {holeCount} holes have tee + green. Minimum {Math.min(9, holeCount)}{' '}
        required to save.
      </p>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || completedCount < Math.min(9, holeCount)}
        className="w-full rounded-lg bg-emerald-700 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50 touch-manipulation min-h-12"
      >
        {saving ? 'Saving…' : 'Save course GPS'}
      </button>
    </section>
  )
}

function MarkButton({
  label,
  done,
  onClick,
  disabled,
  subtle = false,
}: {
  label: string
  done: boolean
  onClick: () => void
  disabled?: boolean
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold touch-manipulation min-h-11 disabled:opacity-50 ${
        done
          ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
          : subtle
            ? 'border-amber-200 bg-white/60 text-amber-900/80'
            : 'border-amber-300 bg-white text-amber-950 hover:bg-amber-50'
      }`}
    >
      {done ? '✓ ' : ''}
      {label}
    </button>
  )
}
