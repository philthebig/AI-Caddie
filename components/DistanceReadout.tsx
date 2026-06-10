'use client'

import type { GeolocationState } from '@/hooks/useGeolocation'
import { getHoleGps, type CourseGpsPayload, type GpsSource } from '@/lib/golf-course-gps/types'
import { distanceInYards, distancesToGreen } from '@/lib/golf-logic/distance'
import { useMemo } from 'react'

type DistanceReadoutProps = {
  holeNumber: number
  holeYardage: number | null | undefined
  courseLatitude: number | null | undefined
  courseLongitude: number | null | undefined
  courseGps: CourseGpsPayload | null
  gpsSource: GpsSource | null
  geo: GeolocationState
}

const SOURCE_LABEL: Record<GpsSource, string> = {
  osm: 'OpenStreetMap',
  manual: 'Course calibration',
  igolf: 'iGolf',
  golfbert: 'Golfbert',
  golfintelligence: 'Golf Intelligence',
}

export default function DistanceReadout({
  holeNumber,
  holeYardage,
  courseLatitude,
  courseLongitude,
  courseGps,
  gpsSource,
  geo,
}: DistanceReadoutProps) {
  const holeGps = getHoleGps(courseGps, holeNumber)

  const hasCourseTarget =
    courseLatitude != null &&
    courseLongitude != null &&
    Number.isFinite(courseLatitude) &&
    Number.isFinite(courseLongitude)

  const distanceToCenter = useMemo(() => {
    if (
      holeGps ||
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
  }, [holeGps, hasCourseTarget, geo.latitude, geo.longitude, courseLatitude, courseLongitude])

  const greenDistances = useMemo(() => {
    if (!holeGps || geo.latitude == null || geo.longitude == null) return null
    return distancesToGreen(
      { latitude: geo.latitude, longitude: geo.longitude },
      holeGps.green
    )
  }, [holeGps, geo.latitude, geo.longitude])

  const showYardage = holeYardage != null && holeYardage > 0
  const showHoleGps = greenDistances != null
  const showCourseCenter = hasCourseTarget && distanceToCenter != null && !holeGps
  const needsEnable = (hasCourseTarget || holeGps) && !geo.active && !showHoleGps && !showCourseCenter
  const showDeniedHelp = (hasCourseTarget || holeGps) && geo.active && geo.unavailable && geo.error

  if (!showYardage && !hasCourseTarget && !holeGps) {
    return null
  }

  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
      aria-label="Distance information"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
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

        {(holeGps || hasCourseTarget) && (
          <div className="min-w-44 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {showHoleGps ? 'Distance to green' : 'GPS distance'}
            </p>

            {needsEnable && (
              <button
                type="button"
                onClick={geo.requestLocation}
                className="mt-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 touch-manipulation min-h-11"
              >
                Enable location
              </button>
            )}

            {geo.loading && !showHoleGps && !showCourseCenter && (
              <p className="text-sm font-medium text-slate-600">Getting location…</p>
            )}

            {showHoleGps && greenDistances && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                <GreenDistance label="Front" yards={greenDistances.front} />
                <GreenDistance label="Center" yards={greenDistances.center} primary />
                <GreenDistance label="Back" yards={greenDistances.back} />
              </div>
            )}

            {showCourseCenter && (
              <p className="text-2xl font-black text-emerald-700 tabular-nums">
                ~{distanceToCenter}
                <span className="ml-1 text-sm font-semibold text-emerald-600/80">yds</span>
              </p>
            )}

            {geo.active && !geo.loading && !showHoleGps && !showCourseCenter && geo.error && (
              <p className="text-sm font-medium text-slate-500">{geo.error}</p>
            )}
          </div>
        )}
      </div>

      {showHoleGps && gpsSource && (
        <p className="mt-2 text-xs text-slate-500">
          Hole {holeNumber} green distances from {SOURCE_LABEL[gpsSource]}. Center is the main
          plays-like target.
        </p>
      )}

      {showCourseCenter && (
        <p className="mt-2 text-xs text-slate-500">
          Approximate distance to course center — not hole-specific. Calibrate this course or wait
          for hole GPS data to load.
        </p>
      )}

      {holeGps && !showHoleGps && geo.active && !geo.loading && (
        <p className="mt-2 text-xs text-slate-500">
          Hole GPS is loaded. Enable location to see live distance to the green.
        </p>
      )}

      {showDeniedHelp && (
        <div className="mt-2 space-y-2 text-xs text-slate-500">
          <p>
            iPhone only shows the location prompt after you tap Enable location. If you still
            don&apos;t see it, check{' '}
            <strong>Settings → Privacy &amp; Security → Location Services</strong> and allow
            location for <strong>Caddie</strong> or <strong>Safari Websites</strong> (While Using,
            Precise Location on).
          </p>
          <button
            type="button"
            onClick={geo.requestLocation}
            className="text-emerald-700 font-semibold hover:text-emerald-900 touch-manipulation min-h-8"
          >
            Try again
          </button>
        </div>
      )}
    </section>
  )
}

function GreenDistance({
  label,
  yards,
  primary = false,
}: {
  label: string
  yards: number
  primary?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`tabular-nums font-black ${
          primary ? 'text-2xl text-emerald-700' : 'text-lg text-emerald-800/90'
        }`}
      >
        {yards}
        <span className="ml-0.5 text-xs font-semibold text-emerald-600/80">yds</span>
      </p>
    </div>
  )
}
