'use client'

import type { HoleCount, HoleInput } from '@/lib/types/golf'
import type { NineSide } from '@/lib/types/course'
import { useEffect, useRef, useState } from 'react'

export type CourseSearchSelection = {
  externalCourseId: number
  courseName: string
  teeName: string
  holes: HoleInput[]
}

type SearchHit = {
  id: number
  label: string
  clubName: string
  courseName: string
  city: string | null
  state: string | null
}

type CourseTee = {
  name: string
  totalYards: number | null
  parTotal: number | null
  courseRating: number | null
  slopeRating: number | null
  holeCount: number
  holes: Array<{
    holeNumber: number
    par: number
    yardage: number
    handicap: number | null
  }>
}

type CourseDetailResponse = {
  id: number
  label: string
  clubName: string
  courseName: string
  city: string | null
  state: string | null
  tees: CourseTee[]
}

export function teeHolesToInputs(
  tee: CourseTee,
  holeCount: HoleCount,
  nineSide: NineSide
): HoleInput[] {
  const sorted = [...tee.holes].sort((a, b) => a.holeNumber - b.holeNumber)
  const slice =
    holeCount === 9 && sorted.length >= 18
      ? nineSide === 'front'
        ? sorted.slice(0, 9)
        : sorted.slice(9, 18)
      : sorted.slice(0, holeCount)

  return slice.map((hole, index) => ({
    holeNumber: index + 1,
    par: hole.par,
    yardage: hole.yardage,
    score: hole.par,
    putts: 2,
    penaltyStrokes: 0,
    ottMissDirection: hole.par === 3 ? null : 'HIT',
    gir: false,
    appMissDirection: 'SHORT',
    approachProximity: null,
    upAndDownAttempt: null,
    upAndDownSuccess: null,
    argProximity: null,
  }))
}

type CourseSearchProps = {
  holeCount: HoleCount
  nineSide: NineSide
  onNineSideChange: (side: NineSide) => void
  onCourseApply: (selection: CourseSearchSelection) => void
  onManualCourseName: (name: string) => void
  onClear: () => void
  appliedSelection: { courseName: string; teeName: string } | null
}

export default function CourseSearch({
  holeCount,
  nineSide,
  onNineSideChange,
  onCourseApply,
  onManualCourseName,
  onClear,
  appliedSelection,
}: CourseSearchProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courseDetail, setCourseDetail] = useState<CourseDetailResponse | null>(null)
  const [selectedTee, setSelectedTee] = useState<CourseTee | null>(null)
  const [manualName, setManualName] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const onCourseApplyRef = useRef(onCourseApply)
  onCourseApplyRef.current = onCourseApply

  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/courses/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? 'Search failed')
        }
        setResults(data.courses ?? [])
        setOpen(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, mode])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selectedTee || !courseDetail) return
    onCourseApplyRef.current({
      externalCourseId: courseDetail.id,
      courseName: courseDetail.label,
      teeName: selectedTee.name,
      holes: teeHolesToInputs(selectedTee, holeCount, nineSide),
    })
  }, [selectedTee, courseDetail, holeCount, nineSide])

  function applyTee(tee: CourseTee) {
    setSelectedTee(tee)
  }

  async function loadCourse(courseId: number) {
    setDetailLoading(true)
    setError(null)
    setCourseDetail(null)
    setSelectedTee(null)
    try {
      const response = await fetch(`/api/courses/${courseId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load course')
      }
      setCourseDetail(data)
      if (data.tees?.length === 1) {
        applyTee(data.tees[0])
      }
      setOpen(false)
      setQuery(data.label)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  function resetSelection() {
    setCourseDetail(null)
    setSelectedTee(null)
    setQuery('')
    setResults([])
    onClear()
  }

  if (mode === 'manual') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-slate-700">Course name</label>
          <button
            type="button"
            onClick={() => {
              setMode('search')
              setManualName('')
              onClear()
            }}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            Search real courses
          </button>
        </div>
        <input
          type="text"
          required
          name="courseName"
          value={manualName}
          onChange={(e) => {
            setManualName(e.target.value)
            onManualCourseName(e.target.value)
          }}
          placeholder="e.g. Local muni"
          className="w-full rounded-md border border-slate-300 p-3 shadow-sm"
        />
      </div>
    )
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-slate-700">Search course</label>
        <button
          type="button"
          onClick={() => {
            setMode('manual')
            resetSelection()
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Enter manually
        </button>
      </div>

      {appliedSelection ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-900">{appliedSelection.courseName}</p>
              <p className="text-sm text-emerald-700 mt-1">{appliedSelection.teeName} tees</p>
            </div>
            <button
              type="button"
              onClick={resetSelection}
              className="text-sm font-medium text-emerald-800 hover:text-emerald-950"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCourseDetail(null)
              setSelectedTee(null)
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search by course or club name…"
            className="w-full rounded-md border border-slate-300 p-3 shadow-sm"
            autoComplete="off"
          />
          {(loading || detailLoading) && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              Searching…
            </span>
          )}

          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {results.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => loadCourse(hit.id)}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0"
                  >
                    <p className="font-medium text-slate-800">{hit.label}</p>
                    {(hit.city || hit.state) && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[hit.city, hit.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error}
          {error.includes('GOLF_COURSE_API_KEY') && (
            <span className="block mt-1 text-slate-500">
              Get a free key at{' '}
              <a
                href="https://golfcourseapi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                golfcourseapi.com
              </a>{' '}
              and add it to <code className="text-xs">.env.local</code>.
            </span>
          )}
        </p>
      )}

      {courseDetail && !appliedSelection && courseDetail.tees.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Select tee box</p>
          <div className="flex flex-wrap gap-2">
            {courseDetail.tees.map((tee) => {
              const active = selectedTee?.name === tee.name
              return (
                <button
                  key={tee.name}
                  type="button"
                  onClick={() => applyTee(tee)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                  }`}
                >
                  {tee.name}
                  {tee.totalYards != null && (
                    <span className="ml-1 font-normal opacity-80">{tee.totalYards} yds</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedTee && selectedTee.holeCount >= 18 && holeCount === 9 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNineSideChange('front')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
              nineSide === 'front'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Front 9
          </button>
          <button
            type="button"
            onClick={() => onNineSideChange('back')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
              nineSide === 'back'
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            Back 9
          </button>
        </div>
      )}
    </div>
  )
}
