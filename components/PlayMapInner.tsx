'use client'

import type { GeolocationState } from '@/hooks/useGeolocation'
import { getHoleGps, type CourseGpsPayload } from '@/lib/golf-course-gps/types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'

export type PlayMapProps = {
  courseLatitude: number | null
  courseLongitude: number | null
  courseGps: CourseGpsPayload | null
  currentHoleNumber: number
  geo: Pick<
    GeolocationState,
    'latitude' | 'longitude' | 'loading' | 'error' | 'unavailable' | 'active' | 'requestLocation'
  >
}

type MapViewControllerProps = {
  points: Array<{ lat: number; lng: number }>
  holeMode: boolean
}

function MapViewController({ points, holeMode }: MapViewControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], holeMode ? 17 : 15)
      return
    }

    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
      padding: [48, 48],
      maxZoom: holeMode ? 18 : 17,
    })
  }, [points, holeMode, map])

  return null
}

export default function PlayMapInner({
  courseLatitude,
  courseLongitude,
  courseGps,
  currentHoleNumber,
  geo,
}: PlayMapProps) {
  const holeGps = getHoleGps(courseGps, currentHoleNumber)

  const hasCourse =
    courseLatitude != null &&
    courseLongitude != null &&
    Number.isFinite(courseLatitude) &&
    Number.isFinite(courseLongitude)

  const hasPlayer = geo.latitude != null && geo.longitude != null

  const mapPoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = []
    if (holeGps) {
      points.push(
        { lat: holeGps.tee.latitude, lng: holeGps.tee.longitude },
        { lat: holeGps.green.center.latitude, lng: holeGps.green.center.longitude }
      )
    } else if (hasCourse) {
      points.push({ lat: courseLatitude!, lng: courseLongitude! })
    }
    if (hasPlayer) {
      points.push({ lat: geo.latitude!, lng: geo.longitude! })
    }
    return points
  }, [holeGps, hasCourse, courseLatitude, courseLongitude, hasPlayer, geo.latitude, geo.longitude])

  if (!hasCourse && !holeGps) {
    return (
      <section
        className="flex h-[40dvh] shrink-0 items-center justify-center border-b border-slate-200 bg-slate-100 px-6 text-center"
        aria-label="Course map unavailable"
      >
        <p className="text-sm text-slate-500">
          Map unavailable — no course location for this round.
        </p>
      </section>
    )
  }

  const center: [number, number] = holeGps
    ? [holeGps.tee.latitude, holeGps.tee.longitude]
    : hasPlayer
      ? [geo.latitude!, geo.longitude!]
      : [courseLatitude!, courseLongitude!]

  const holeLine: [number, number][] | null = holeGps
    ? [
        [holeGps.tee.latitude, holeGps.tee.longitude],
        [holeGps.green.center.latitude, holeGps.green.center.longitude],
      ]
    : null

  return (
    <section
      className="relative h-[40dvh] shrink-0 w-full border-b border-slate-200"
      aria-label="Course map"
    >
      <MapContainer
        center={center}
        zoom={holeGps ? 17 : 15}
        className="h-full w-full z-0"
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {holeLine && (
          <Polyline
            positions={holeLine}
            pathOptions={{ color: '#059669', weight: 3, opacity: 0.7, dashArray: '6 8' }}
          />
        )}

        {holeGps ? (
          <>
            <CircleMarker
              center={[holeGps.tee.latitude, holeGps.tee.longitude]}
              radius={9}
              pathOptions={{
                color: '#b45309',
                fillColor: '#f59e0b',
                fillOpacity: 0.95,
                weight: 2,
              }}
            />
            <CircleMarker
              center={[holeGps.green.front.latitude, holeGps.green.front.longitude]}
              radius={6}
              pathOptions={{
                color: '#047857',
                fillColor: '#6ee7b7',
                fillOpacity: 0.9,
                weight: 2,
              }}
            />
            <CircleMarker
              center={[holeGps.green.center.latitude, holeGps.green.center.longitude]}
              radius={10}
              pathOptions={{
                color: '#047857',
                fillColor: '#10b981',
                fillOpacity: 0.95,
                weight: 2,
              }}
            />
            <CircleMarker
              center={[holeGps.green.back.latitude, holeGps.green.back.longitude]}
              radius={6}
              pathOptions={{
                color: '#047857',
                fillColor: '#34d399',
                fillOpacity: 0.9,
                weight: 2,
              }}
            />
          </>
        ) : (
          hasCourse && (
            <CircleMarker
              center={[courseLatitude!, courseLongitude!]}
              radius={10}
              pathOptions={{
                color: '#047857',
                fillColor: '#10b981',
                fillOpacity: 0.9,
                weight: 2,
              }}
            />
          )
        )}

        {hasPlayer && (
          <CircleMarker
            center={[geo.latitude!, geo.longitude!]}
            radius={8}
            pathOptions={{
              color: '#1d4ed8',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 2,
            }}
          />
        )}

        <MapViewController points={mapPoints} holeMode={Boolean(holeGps)} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-1 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
        {holeGps ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-700/30" />
              Tee
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-700/30" />
              Green (F / C / B)
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-700/30" />
            Course center
          </span>
        )}
        {hasPlayer && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-700/30" />
            You
          </span>
        )}
      </div>

      {!geo.active && (
        <button
          type="button"
          onClick={geo.requestLocation}
          className="absolute top-2 right-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-md backdrop-blur-sm hover:bg-white touch-manipulation min-h-10"
        >
          Show my position
        </button>
      )}

      {geo.active && geo.loading && !hasPlayer && (
        <div className="pointer-events-none absolute top-2 right-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-md backdrop-blur-sm">
          Locating…
        </div>
      )}
    </section>
  )
}
