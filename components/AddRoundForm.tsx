'use client'

import { createRound } from '@/app/actions'
import CourseSearch, { type CourseSearchSelection } from '@/components/CourseSearch'
import ToggleGroup from '@/components/ToggleGroup'
import {
  APP_MISS_DIRECTIONS,
  emptyHole,
  OTT_MISS_DIRECTIONS,
  type HoleCount,
  type HoleInput,
} from '@/lib/types/golf'
import type { NineSide } from '@/lib/types/course'
import { useCallback, useMemo, useRef, useState } from 'react'

const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 4]

function ToggleYesNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <ToggleGroup
      label={label}
      options={['YES', 'NO'] as const}
      value={value ? 'YES' : 'NO'}
      onChange={(v) => onChange(v === 'YES')}
      labels={{ YES: 'Yes', NO: 'No' }}
    />
  )
}

export default function AddRoundForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState<'setup' | 'holes' | 'review'>('setup')
  const [courseName, setCourseName] = useState('')
  const [externalCourseId, setExternalCourseId] = useState<number | null>(null)
  const [teeName, setTeeName] = useState<string | null>(null)
  const [nineSide, setNineSide] = useState<NineSide>('front')
  const [holeCount, setHoleCount] = useState<HoleCount>(18)
  const [showCourseDetails, setShowCourseDetails] = useState(false)
  const [currentHole, setCurrentHole] = useState(0)
  const [holes, setHoles] = useState<HoleInput[]>(() =>
    DEFAULT_PARS_18.map((par, i) => emptyHole(i + 1, par))
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    setError(null)
    const payload = activeHoles.map((h) => ({
      ...h,
      appMissDirection: h.gir ? null : (h.appMissDirection ?? 'SHORT'),
      ottMissDirection: (h.par ?? 4) === 3 ? null : (h.ottMissDirection ?? 'HIT'),
    }))
    formData.set('holesJson', JSON.stringify(payload))
    formData.set('coursePar', String(coursePar))
    formData.set('courseName', courseName)
    if (externalCourseId != null) {
      formData.set('externalCourseId', String(externalCourseId))
    }
    if (teeName) {
      formData.set('teeName', teeName)
    }
    const result = await createRound(formData)
    setSubmitting(false)

    if (result?.error) {
      setError(result.error)
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
    setHoles(DEFAULT_PARS_18.map((par, i) => emptyHole(i + 1, par)))
    setStep('setup')
  }

  const hole = activeHoles[currentHole]
  const isPar3 = (hole?.par ?? 4) === 3
  const canStartEntry = courseName.trim().length > 0 && (hasRealCourse || !appliedSelection)

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8">
      <h3 className="text-xl font-bold mb-1 text-emerald-800">Log a New Round</h3>
      <p className="text-sm text-slate-500 mb-4">
        Search a real course for par and yardages, then log hole-by-hole stats.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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

        {step === 'setup' && (
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

            <button
              type="button"
              disabled={!canStartEntry}
              onClick={() => {
                if (!hasRealCourse) {
                  initHoles(holeCount)
                }
                setStep('holes')
              }}
              className="w-full rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Start hole-by-hole entry →
            </button>
          </div>
        )}

        {step === 'holes' && hole && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">
                Hole {hole.holeNumber}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Par {hole.par ?? 4}
                  {hole.yardage != null ? ` · ${hole.yardage} yds` : ''}
                </span>
              </h4>
              <span className="text-sm text-slate-400">
                {currentHole + 1} / {holeCount}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Score</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={hole.score}
                  onChange={(e) => updateHole(currentHole, { score: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 p-3 text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Putts</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={hole.putts}
                  onChange={(e) => updateHole(currentHole, { putts: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 p-3 text-lg font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Penalty strokes</label>
              <input
                type="number"
                min={0}
                max={5}
                value={hole.penaltyStrokes}
                onChange={(e) => updateHole(currentHole, { penaltyStrokes: Number(e.target.value) })}
                className="w-full rounded-md border border-slate-300 p-3"
              />
            </div>

            {!isPar3 && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
                  Off the Tee (OTT)
                </p>
                <ToggleGroup
                  label="Driving result"
                  options={OTT_MISS_DIRECTIONS}
                  value={hole.ottMissDirection ?? 'HIT'}
                  onChange={(v) => updateHole(currentHole, { ottMissDirection: v })}
                  labels={{ LEFT: 'Left', HIT: 'Fairway', RIGHT: 'Right' }}
                />
              </div>
            )}

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
                Approach (APP)
              </p>
              <ToggleYesNo
                label="Green in regulation"
                value={hole.gir}
                onChange={(gir) => updateHole(currentHole, { gir })}
              />
              {!hole.gir && (
                <div className="mt-4 space-y-4">
                  <ToggleGroup
                    label="Miss direction"
                    options={APP_MISS_DIRECTIONS}
                    value={hole.appMissDirection ?? 'SHORT'}
                    onChange={(v) => updateHole(currentHole, { appMissDirection: v })}
                    labels={{ LEFT: 'Left', RIGHT: 'Right', SHORT: 'Short', LONG: 'Long' }}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Approach proximity (feet from pin)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      placeholder="e.g. 25"
                      value={hole.approachProximity ?? ''}
                      onChange={(e) =>
                        updateHole(currentHole, {
                          approachProximity: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 p-3"
                    />
                  </div>
                </div>
              )}
            </div>

            {!hole.gir && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-3">
                  Around the Green (ARG)
                </p>
                <ToggleYesNo
                  label="Up-and-down attempt"
                  value={hole.upAndDownAttempt ?? false}
                  onChange={(v) =>
                    updateHole(currentHole, {
                      upAndDownAttempt: v,
                      upAndDownSuccess: v ? hole.upAndDownSuccess : null,
                    })
                  }
                />
                {hole.upAndDownAttempt && (
                  <div className="mt-4 space-y-4">
                    <ToggleYesNo
                      label="Saved par / up-and-down"
                      value={hole.upAndDownSuccess ?? false}
                      onChange={(v) => updateHole(currentHole, { upAndDownSuccess: v })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Chip proximity (feet)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g. 8"
                        value={hole.argProximity ?? ''}
                        onChange={(e) =>
                          updateHole(currentHole, {
                            argProximity: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 p-3"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={currentHole === 0}
                onClick={() => setCurrentHole((h) => h - 1)}
                className="flex-1 rounded-md border border-slate-300 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Previous
              </button>
              {currentHole < holeCount - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentHole((h) => h + 1)}
                  className="flex-1 rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
                >
                  Next hole →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className="flex-1 rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700"
                >
                  Review round →
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStep('setup')}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to setup
            </button>
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

            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
              {activeHoles.map((h) => (
                <div key={h.holeNumber} className="flex justify-between px-3 py-2">
                  <span>
                    H{h.holeNumber} (par {h.par ?? 4}
                    {h.yardage != null ? `, ${h.yardage} yds` : ''})
                  </span>
                  <span className="text-slate-600">
                    {h.score} · {h.putts}p
                    {h.gir ? ' · GIR' : ` · ${h.appMissDirection}`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('holes')
                  setCurrentHole(holeCount - 1)
                }}
                className="flex-1 rounded-md border border-slate-300 py-3 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Edit holes
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-md bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save round ⛳'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
