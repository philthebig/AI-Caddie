'use client'

import { useGeolocation } from '@/hooks/useGeolocation'
import { distanceInYards } from '@/lib/golf-logic/distance'
import { useMemo } from 'react'

type DistanceReadoutProps = {
  holeYardage: number | null | undefined
  courseLatitude: number | null | undefined
  courseLongitude: number | null | undefined
}

export default function DistanceReadout({
  holeYardage,
  courseLatitude,
  courseLongitude,
}: DistanceReadoutProps) {
  const hasCourseTarget =
    courseLatitude != null &&
    courseLongitude != null &&
    Number.isFinite(courseLatitude) &&
    Number.isFinite(courseLongitude)

  const geo = useGeolocation(hasCourseTarget)

  const distanceToCenter = useMemo(() => {
    if (
      !hasCourseTarget ||
      geo.latitude == null ||
      geo.longitude == null
    ) {
      return null
    }
    return distanceInYards(
      { latitude: geo.latitude, longitude: geo.longitude },
      { latitude: courseLatitude, longitude: courseLongitude }
    )
  }, [hasCourseTarget, geo.latitude, geo.longitude, courseLatitude, courseLongitude])

  const showYardage = holeYardage != null && holeYardage > 0
  const showGps = hasCourseTarget && distanceToCenter != null

  if (!showYardage && !hasCourseTarget) {
    return null
  }

  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      aria-label="Distance information"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {showYardage && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Hole yardage
            </p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">
              {holeYardage}
              <span className="ml-1 text-sm font-semibold text-slate-500">yds</span>
            </p>
          </div>
        )}

        {hasCourseTarget && (
          <div className="min-w-40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              GPS distance
            </p>
            {geo.loading && !showGps && (
              <p className="text-sm font-medium text-slate-600">Getting location…</p>
            )}
            {showGps && (
              <p className="text-2xl font-black text-emerald-700 tabular-nums">
                ~{distanceToCenter}
                <span className="ml-1 text-sm font-semibold text-emerald-600/80">yds</span>
              </p>
            )}
            {!geo.loading && !showGps && geo.error && (
              <p className="text-sm font-medium text-slate-500">{geo.error}</p>
            )}
          </div>
        )}
      </div>

      {showGps && (
        <p className="mt-2 text-xs text-slate-500">
          Approximate distance to course center — not hole-specific. Tee yardage is the listed
          hole length from your selected tee.
        </p>
      )}

      {hasCourseTarget && !geo.loading && !showGps && geo.unavailable && showYardage && (
        <p className="mt-2 text-xs text-slate-500">
          Enable location to see approximate distance to the course.
        </p>
      )}
    </section>
  )
}
