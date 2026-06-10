import type { LatLng } from '@/lib/golf-course-gps/types'
import { haversineDistanceMeters, metersToYards } from '@/lib/golf-logic/distance'

const DEFAULT_GREEN_DEPTH_YARDS = 8

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI
}

/** Initial bearing from point A to B, degrees clockwise from north. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.latitude)
  const lat2 = toRad(to.latitude)
  const dLon = toRad(to.longitude - from.longitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Destination point given start, bearing (deg), and distance (meters). */
export function destinationPoint(
  from: LatLng,
  bearingDeg: number,
  distanceMeters: number
): LatLng {
  const R = 6_371_000
  const brng = toRad(bearingDeg)
  const lat1 = toRad(from.latitude)
  const lon1 = toRad(from.longitude)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceMeters / R) +
      Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(brng)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceMeters / R) * Math.cos(lat1),
      Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2)
    )
  return { latitude: toDeg(lat2), longitude: toDeg(lon2) }
}

function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) {
    throw new Error('centroid requires at least one point')
  }
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 }
  )
  return {
    latitude: sum.lat / points.length,
    longitude: sum.lng / points.length,
  }
}

/** Project a point onto the line from origin along bearing; returns signed meters. */
function projectAlongBearing(origin: LatLng, point: LatLng, bearingDeg: number): number {
  const dist = haversineDistanceMeters(
    origin.latitude,
    origin.longitude,
    point.latitude,
    point.longitude
  )
  const pointBearing = bearingDegrees(origin, point)
  const angleDiff = toRad(pointBearing - bearingDeg)
  return dist * Math.cos(angleDiff)
}

/**
 * Front / center / back from a green polygon (or polyline), measured along the
 * tee-to-green playing line.
 */
export function greenExtentsFromPolygon(
  tee: LatLng,
  greenNodes: LatLng[]
): { front: LatLng; center: LatLng; back: LatLng } {
  if (greenNodes.length === 0) {
    throw new Error('greenExtentsFromPolygon requires green nodes')
  }

  const center = centroid(greenNodes)
  const lineBearing = bearingDegrees(tee, center)

  let minProj = Infinity
  let maxProj = -Infinity
  let front = greenNodes[0]
  let back = greenNodes[0]

  for (const node of greenNodes) {
    const proj = projectAlongBearing(tee, node, lineBearing)
    if (proj < minProj) {
      minProj = proj
      front = node
    }
    if (proj > maxProj) {
      maxProj = proj
      back = node
    }
  }

  return { front, center, back }
}

/** When only green center is known, estimate front/back along the tee line. */
export function estimateGreenExtentsFromCenter(
  tee: LatLng,
  greenCenter: LatLng,
  depthYards = DEFAULT_GREEN_DEPTH_YARDS
): { front: LatLng; center: LatLng; back: LatLng } {
  const bearing = bearingDegrees(tee, greenCenter)
  const halfDepthMeters = (depthYards / 2) * 0.9144
  return {
    front: destinationPoint(greenCenter, (bearing + 180) % 360, halfDepthMeters),
    center: greenCenter,
    back: destinationPoint(greenCenter, bearing, halfDepthMeters),
  }
}

export function greenDepthYards(front: LatLng, back: LatLng): number {
  return metersToYards(
    haversineDistanceMeters(
      front.latitude,
      front.longitude,
      back.latitude,
      back.longitude
    )
  )
}
