'use client'

import { createRound, updateRound } from '@/app/actions'
import { startRound } from '@/app/actions/play'
import CourseSearch, { type CourseSearchSelection } from '@/components/CourseSearch'
import HoleNavBar from '@/components/HoleNavBar'
import HolePicker from '@/components/HolePicker'
import HoleScoreCard from '@/components/HoleScoreCard'
import ToggleGroup from '@/components/ToggleGroup'
import {
  emptyHole,
  type CreateRoundErrorDetails,
  type HoleCount,
  type HoleInput,
  type RoundFormEditData,
} from '@/lib/types/golf'
import type { NineSide } from '@/lib/types/course'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4]

type AddRoundFormProps = {
  edit?: RoundFormEditData
}

export default function AddRoundForm({ edit }: AddRoundFormProps) {
  const router = useRouter()
  const isEdit = edit != null
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState<'setup' | 'holes' | 'review'>(isEdit ? 'holes' : 'setup')
  const [courseName, setCourseName] = useState(edit?.courseName ?? '')
  const [externalCourseId, setExternalCourseId] = useState<number | null>(
    edit?.externalCourseId ?? null
  )
  const [teeName, setTeeName] = useState<string | null>(edit?.teeName ?? null)
  const [nineSide, setNineSide] = useState<NineSide>('front')
  const [holeCount, setHoleCount] = useState<HoleCount>(edit?.holeCount ?? 18)
  const [showCourseDetails, setShowCourseDetails] = useState(isEdit)
  const [currentHole, setCurrentHole] = useState(() => {
    const start = edit?.startHole ?? 0
    const max = (edit?.holeCount ?? 18) - 1
    return Math.min(Math.max(start, 0), max)
  })
  const [holes, setHoles] = useState<HoleInput[]>(() =>
    edit?.holes ?? DEFAULT_PARS_18.map((par, i) => emptyHole(i + 1, par))
  )
  const [completedHoles, setCompletedHoles] = useState<Set<number>>(() => {
    if (!edit) return new Set()
    return new Set(Array.from({ length: edit.holeCount }, (_, i) => i))
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [startingPlay, setStartingPlay] = useState(false)

  function applySubmitErrors(message: string, details?: CreateRoundErrorDetails) {
    const fromDetails = [
      ...(details?.formErrors ?? []),
      ...Object.values(details?.fieldErrors ?? {}).flatMap((errs) => errs ?? []),
    ]
    const messages = message.split('; ').filter(Boolean)
    const unique = [...new Set([...messages, ...fromDetails].filter(Boolean))]

    setFieldErrors(unique)
    setError(unique.length > 1 ? 'Please fix the issues below:' : unique[0] ?? message)

    const holeMatch = unique.join(' ').match(/Hole (\d+):/)
    if (holeMatch) {
      setStep('holes')
      setCurrentHole(Number(holeMatch[1]) - 1)
    }
  }

  const hasRealCourse = externalCourseId != null && teeName != null

  const activeHoles = useMemo(() => holes.slice(0, holeCount), [holes, holeCount])
  const coursePar = useMemo(
    () => activeHoles.reduce((sum, h) => sum + (h.par ?? 4), 0),
    [activeHoles]
  )

  const appliedSelection = useMemo(() => {
    if (!hasRealCourse || !courseName || !teeName) return null
    return { courseName, teeName }
  }, [hasRealCourse, courseName, teeName])

  function initHoles(count: HoleCount, source?: HoleInput[]) {
    if (source && source.length >= count) {
      setHoles(source.slice(0, count))
      setCurrentHole(0)
      return
    }

    setHoles((prev) => {
      const next = Array.from({ length: count }, (_, i) => {
        const existing = prev[i]
        const par = existing?.par ?? DEFAULT_PARS_18[i] ?? 4
        return existing?.holeNumber === i + 1 ? existing : emptyHole(i + 1, par)
      })
      return next
    })
    setCurrentHole(0)
  }

  const handleCourseApply = useCallback((selection: CourseSearchSelection) => {
    setCourseName(selection.courseName)
    setExternalCourseId(selection.externalCourseId)
    setTeeName(selection.teeName)
    setHoles(selection.holes)
    setCurrentHole(0)
    setShowCourseDetails(true)
  }, [])

  const handleManualCourseName = useCallback((name: string) => {
    setCourseName(name)
    setExternalCourseId(null)
    setTeeName(null)
  }, [])

  const handleCourseClear = useCallback(() => {
    setCourseName('')
    setExternalCourseId(null)
    setTeeName(null)
    initHoles(holeCount)
    setShowCourseDetails(false)
  }, [holeCount])

  function updateHole(index: number, patch: Partial<HoleInput>) {
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
  }

  function updateCourseDetail(index: number, field: 'par' | 'yardage', value: number | undefined) {
    updateHole(index, field === 'par' ? { par: value } : { yardage: value })
  }

  function markHoleComplete(index: number) {
    setCompletedHoles((prev) => new Set(prev).add(index))
  }

  function goToHole(index: number) {
    setCurrentHole(index)
    setStep('holes')
    setPickerOpen(false)
  }

  function goPrevHole() {
    if (currentHole > 0) setCurrentHole((h) => h - 1)
  }

  function goNextHole() {
    markHoleComplete(currentHole)
    if (currentHole < holeCount - 1) {
      setCurrentHole((h) => h + 1)
    }
  }

  function goToReview() {
    markHoleComplete(currentHole)
    setStep('review')
    setPickerOpen(false)
  }

  function buildRoundFormData() {
    const formData = new FormData()
    const payload = activeHoles.map((h) => ({
      ...h,
      appMissDirection: h.gir ? null : (h.appMissDirection ?? 'SHORT'),
      ottMissDirection: (h.par ?? 4) === 3 ? null : (h.ottMissDirection ?? 'HIT'),
    }))
    formData.set('holesJson', JSON.stringify(payload))
    formData.set('coursePar', String(coursePar))
    formData.set('courseName', courseName)
    formData.set('holeCount', String(holeCount))
    if (externalCourseId != null) {
      formData.set('externalCourseId', String(externalCourseId))
    }
    if (teeName) {
      formData.set('teeName', teeName)
    }
    return formData
  }

  async function handleStartOnCourse() {
    if (!canStartEntry) return
    if (!hasRealCourse) {
      initHoles(holeCount)
    }
    setStartingPlay(true)
    setError(null)
    setFieldErrors([])

    const result = await startRound(buildRoundFormData())
    setStartingPlay(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    if (result?.roundId) {
      router.push(`/play/${result.roundId}`)
    }
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    setError(null)
    setFieldErrors([])
    const payload = activeHoles.map((h) => ({
      ...h,
      appMissDirection: h.gir ? null : (h.appMissDirection ?? 'SHORT'),
      ottMissDirection: (h.par ?? 4) === 3 ? null : (h.ottMissDirection ?? 'HIT'),
    }))
    formData.set('holesJson', JSON.stringify(payload))
    formData.set('coursePar', String(coursePar))
    formData.set('courseName', courseName)
    formData.set('holeCount', String(holeCount))
    if (externalCourseId != null) {
      formData.set('externalCourseId', String(externalCourseId))
    }
    if (teeName) {
      formData.set('teeName', teeName)
    }

    const result = isEdit
      ? await updateRound(edit.roundId, formData)
      : await createRound(formData)
    setSubmitting(false)

    if (result?.error) {
      applySubmitErrors(result.error, 'details' in result ? result.details : undefined)
      return
    }

    if (!result || !('success' in result) || !result.success) {
      applySubmitErrors('Something went wrong. Please try again.')
      return
    }

    if (isEdit && edit) {
      router.push(`/rounds/${edit.roundId}`)
      router.refresh()
      return
    }

    formRef.current?.reset()
    setCourseName('')
    setExternalCourseId(null)
    setTeeName(null)
    setNineSide('front')
    setHoleCount(18)
    setShowCourseDetails(false)
    setCurrentHole(0)
    setCompletedHoles(new Set())
    setHoles(DEFAULT_PARS_18.map((par, i) => emptyHole(i + 1, par)))
    setStep('setup')
    router.refresh()
  }

  const hole = activeHoles[currentHole]
  const canStartEntry = courseName.trim().length > 0 && (hasRealCourse || !appliedSelection)

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
      {isEdit && edit ? (
        <div className="mb-4">
          <Link
            href={`/rounds/${edit.roundId}`}
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Back to round
          </Link>
          <h3 className="text-xl font-bold mt-2 text-emerald-800">Edit round</h3>
          <p className="text-sm text-slate-500">
            {courseName}
            {teeName && ` · ${teeName} tees`} · {holeCount} holes
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-xl font-bold mb-1 text-emerald-800">Log a New Round</h3>
          <p className="text-sm text-slate-500 mb-4">
            Search a real course for par and yardages, then log hole-by-hole stats.
          </p>
        </>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          {fieldErrors.length > 1 && (
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {fieldErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-6">
        <input type="hidden" name="holesJson" value={JSON.stringify(activeHoles)} />
        <input type="hidden" name="coursePar" value={coursePar} />
        <input type="hidden" name="courseName" value={courseName} />
        <input type="hidden" name="holeCount" value={holeCount} />
        {externalCourseId != null && (
          <input type="hidden" name="externalCourseId" value={externalCourseId} />
        )}
        {teeName && <input type="hidden" name="teeName" value={teeName} />}

        {step === 'setup' && !isEdit && (
          <div className="space-y-4">
            <CourseSearch
              holeCount={holeCount}
              nineSide={nineSide}
              onNineSideChange={setNineSide}
              onCourseApply={handleCourseApply}
              onManualCourseName={handleManualCourseName}
              onClear={handleCourseClear}
              appliedSelection={appliedSelection}
            />

            <ToggleGroup
              label="Holes played"
              options={['9', '18'] as const}
              value={String(holeCount)}
              onChange={(count) => {
                const n = Number(count) as HoleCount
                setHoleCount(n)
                if (!hasRealCourse) {
                  initHoles(n)
                }
              }}
            />

            {(hasRealCourse || showCourseDetails) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Course layout · Par {coursePar}
                  </p>
                  {!hasRealCourse && (
                    <button
                      type="button"
                      onClick={() => setShowCourseDetails(false)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      Hide
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {activeHoles.map((h, i) => (
                    <div key={h.holeNumber} className="rounded-md bg-white p-2 border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 mb-1">Hole {h.holeNumber}</p>
                      <p className="text-sm font-semibold text-slate-800">
                        Par {h.par ?? 4}
                        {h.yardage != null ? ` · ${h.yardage} yds` : ''}
                      </p>
                      {!hasRealCourse && (
                        <>
                          <label className="text-xs text-slate-500">Par</label>
                          <select
                            value={h.par ?? 4}
                            onChange={(e) => updateCourseDetail(i, 'par', Number(e.target.value))}
                            className="w-full rounded border border-slate-200 p-1 text-sm mb-1"
                          >
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                          </select>
                          <label className="text-xs text-slate-500">Yds</label>
                          <input
                            type="number"
                            min={50}
                            max={700}
                            placeholder="—"
                            value={h.yardage ?? ''}
                            onChange={(e) =>
                              updateCourseDetail(
                                i,
                                'yardage',
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                            className="w-full rounded border border-slate-200 p-1 text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasRealCourse && !showCourseDetails && (
              <button
                type="button"
                onClick={() => setShowCourseDetails(true)}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
              >
                + Add par & yardages manually (optional)
              </button>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={!canStartEntry || startingPlay}
                onClick={handleStartOnCourse}
                className="w-full rounded-xl bg-emerald-600 py-3.5 min-h-12 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
              >
                {startingPlay ? 'Starting…' : 'Start round on course →'}
              </button>
              <button
                type="button"
                disabled={!canStartEntry}
                onClick={() => {
                  if (!hasRealCourse) {
                    initHoles(holeCount)
                  }
                  setStep('holes')
                }}
                className="w-full rounded-xl border border-slate-300 py-3.5 min-h-12 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 touch-manipulation"
              >
                Log round after the fact →
              </button>
            </div>
          </div>
        )}

        {step === 'holes' && hole && (
          <div className="space-y-5 pb-36">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">
                Hole {hole.holeNumber}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Par {hole.par ?? 4}
                  {hole.yardage != null ? ` · ${hole.yardage} yds` : ''}
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                className="text-sm font-semibold text-emerald-700 min-h-11 px-2 touch-manipulation"
              >
                {currentHole + 1} / {holeCount}
              </button>
            </div>

            {pickerOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:hidden">
                <HolePicker
                  holeCount={holeCount}
                  currentHole={currentHole}
                  completedHoles={completedHoles}
                  onSelect={goToHole}
                />
              </div>
            )}

            <HoleScoreCard
              hole={hole}
              onUpdate={(patch) => updateHole(currentHole, patch)}
            />

            {!isEdit && (
              <button
                type="button"
                onClick={() => setStep('setup')}
                className="text-sm text-slate-500 hover:text-slate-700 min-h-11"
              >
                ← Back to setup
              </button>
            )}

            <HoleNavBar
              currentHole={currentHole}
              holeCount={holeCount}
              completedHoles={completedHoles}
              onSelectHole={goToHole}
              onPrev={goPrevHole}
              onNext={goNextHole}
              onReview={goToReview}
              pickerOpen={pickerOpen}
              onTogglePicker={() => setPickerOpen((o) => !o)}
            />
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-slate-800">Review</h4>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
              <p>
                <span className="font-semibold">{courseName}</span>
                {teeName && <span className="text-slate-500"> · {teeName} tees</span>}
                {' · '}
                {holeCount} holes · Par {coursePar}
              </p>
              <p>
                Total score:{' '}
                <span className="font-bold">{activeHoles.reduce((s, h) => s + h.score, 0)}</span>
                {' · '}
                Putts:{' '}
                <span className="font-bold">{activeHoles.reduce((s, h) => s + h.putts, 0)}</span>
                {' · '}
                GIR:{' '}
                <span className="font-bold">{activeHoles.filter((h) => h.gir).length}</span>
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                Tap a hole to edit
              </p>
              <HolePicker
                holeCount={holeCount}
                currentHole={currentHole}
                completedHoles={
                  new Set(Array.from({ length: holeCount }, (_, i) => i))
                }
                onSelect={(i) => {
                  setStep('holes')
                  goToHole(i)
                }}
              />
            </div>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              {activeHoles.map((h, i) => (
                <button
                  key={h.holeNumber}
                  type="button"
                  onClick={() => goToHole(i)}
                  className="flex w-full justify-between px-3 py-2.5 hover:bg-slate-50 text-left touch-manipulation"
                >
                  <span>
                    H{h.holeNumber} (par {h.par ?? 4}
                    {h.yardage != null ? `, ${h.yardage} yds` : ''})
                  </span>
                  <span className="text-slate-600">
                    {h.score} · {h.putts}p
                    {h.gir ? ' · GIR' : ` · ${h.appMissDirection}`}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('holes')
                  setCurrentHole(holeCount - 1)
                }}
                className="flex-1 rounded-xl border border-slate-300 py-3.5 min-h-12 font-semibold text-slate-600 hover:bg-slate-50 touch-manipulation"
              >
                Edit holes
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save round ⛳'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
