const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_YARD = 0.9144

export type LatLng = {
  latitude: number
  longitude: number
}

/** Convert meters to whole yards (golf distances are typically shown as integers). */
export function metersToYards(meters: number): number {
  return Math.round(meters / METERS_PER_YARD)
}

/** Great-circle distance between two WGS-84 coordinates, in meters. */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/** Distance between two points, rounded to whole yards. */
export function distanceInYards(from: LatLng, to: LatLng): number {
  return metersToYards(
    haversineDistanceMeters(from.latitude, from.longitude, to.latitude, to.longitude)
  )
}
