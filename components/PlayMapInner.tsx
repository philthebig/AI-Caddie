'use client'

import type { GeolocationState } from '@/hooks/useGeolocation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'

export type PlayMapProps = {
  courseLatitude: number | null
  courseLongitude: number | null
  geo: Pick<
    GeolocationState,
    'latitude' | 'longitude' | 'loading' | 'error' | 'unavailable' | 'active' | 'requestLocation'
  >
}

type MapViewControllerProps = {
  course: { lat: number; lng: number } | null
  player: { lat: number; lng: number } | null
}

function MapViewController({ course, player }: MapViewControllerProps) {
  const map = useMap()

  useEffect(() => {
    const points: L.LatLngExpression[] = []
    if (course) points.push([course.lat, course.lng])
    if (player) points.push([player.lat, player.lng])
    if (points.length === 0) return

    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }

    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 17 })
  }, [course, player, map])

  return null
}

export default function PlayMapInner({
  courseLatitude,
  courseLongitude,
  geo,
}: PlayMapProps) {
  const hasCourse =
    courseLatitude != null &&
    courseLongitude != null &&
    Number.isFinite(courseLatitude) &&
    Number.isFinite(courseLongitude)

  const hasPlayer = geo.latitude != null && geo.longitude != null

  if (!hasCourse) {
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

  const center: [number, number] = hasPlayer
    ? [geo.latitude!, geo.longitude!]
    : [courseLatitude, courseLongitude]

  const coursePoint = { lat: courseLatitude, lng: courseLongitude }
  const playerPoint = hasPlayer ? { lat: geo.latitude!, lng: geo.longitude! } : null

  return (
    <section
      className="relative h-[40dvh] shrink-0 w-full border-b border-slate-200"
      aria-label="Course map"
    >
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full z-0"
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[courseLatitude, courseLongitude]}
          radius={10}
          pathOptions={{
            color: '#047857',
            fillColor: '#10b981',
            fillOpacity: 0.9,
            weight: 2,
          }}
        />
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
        <MapViewController course={coursePoint} player={playerPoint} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-1 rounded-lg bg-white/90 px-2.5 py-2 text-[10px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-700/30" />
          Course center
        </span>
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
