import { buildCourseGpsCacheKey } from '@/lib/golf-course-gps/cache-key'
import {
  estimateGreenExtentsFromCenter,
  greenExtentsFromPolygon,
} from '@/lib/golf-course-gps/green-extents'
import type { GpsDataProvider } from '@/lib/golf-course-gps/providers/types'
import { destinationPoint } from '@/lib/golf-course-gps/green-extents'
import type { CourseGpsContext, CourseGpsPayload, HoleGps, LatLng } from '@/lib/golf-course-gps/types'
import { haversineDistanceMeters } from '@/lib/golf-logic/distance'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const USER_AGENT = 'AI-Caddie/1.0 (on-course play; contact: local-dev)'
const SEARCH_RADIUS_METERS = 2500
const BBOX_PAD_DEG = 0.012

type OsmElement = {
  type: 'way' | 'node' | 'relation'
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number; lon: number }>
  center?: { lat: number; lon: number }
  lat?: number
  lon?: number
}

type OsmResponse = { elements: OsmElement[] }

function hasCoordinates(ctx: CourseGpsContext): boolean {
  return (
    ctx.latitude != null &&
    ctx.longitude != null &&
    Number.isFinite(ctx.latitude) &&
    Number.isFinite(ctx.longitude)
  )
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na.includes(nb) || nb.includes(na)) return 1
  const tokensA = new Set(na.split(' '))
  const tokensB = new Set(nb.split(' '))
  let overlap = 0
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++
  }
  return overlap / Math.max(tokensA.size, tokensB.size)
}

function parseHoleNumber(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null
  const raw = tags.ref ?? tags.name ?? tags['golf:hole'] ?? tags.hole
  if (!raw) return null
  const match = String(raw).match(/\d{1,2}/)
  if (!match) return null
  const n = Number(match[0])
  return Number.isInteger(n) && n >= 1 && n <= 18 ? n : null
}

function wayNodes(element: OsmElement): LatLng[] {
  if (!element.geometry?.length) return []
  return element.geometry.map((g) => ({ latitude: g.lat, longitude: g.lon }))
}

function wayEndpoints(nodes: LatLng[]): { start: LatLng; end: LatLng } | null {
  if (nodes.length < 2) return null
  return { start: nodes[0], end: nodes[nodes.length - 1] }
}

function nearestFeature(
  point: LatLng,
  features: OsmElement[],
  maxDistanceMeters: number
): LatLng | null {
  let best: LatLng | null = null
  let bestDist = maxDistanceMeters

  for (const feature of features) {
    const nodes = wayNodes(feature)
    if (nodes.length === 0) continue
    const candidate =
      nodes.length === 1
        ? nodes[0]
        : {
            latitude:
              nodes.reduce((s, n) => s + n.latitude, 0) / nodes.length,
            longitude:
              nodes.reduce((s, n) => s + n.longitude, 0) / nodes.length,
          }
    const dist = haversineDistanceMeters(
      point.latitude,
      point.longitude,
      candidate.latitude,
      candidate.longitude
    )
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }

  return best
}

function buildHoleGps(
  holeNumber: number,
  tee: LatLng,
  greenNodes: LatLng[],
  greenCenterFallback: LatLng
): HoleGps {
  const green =
    greenNodes.length >= 3
      ? greenExtentsFromPolygon(tee, greenNodes)
      : estimateGreenExtentsFromCenter(tee, greenCenterFallback)

  return { holeNumber, tee, green }
}

async function overpassQuery(query: string): Promise<OsmResponse> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 60 * 60 * 24 * 7 },
  })

  if (!response.ok) {
    console.warn(`Overpass request failed: ${response.status}`)
    return { elements: [] }
  }

  const text = await response.text()
  if (text.includes('<strong') && text.includes('Error')) {
    console.warn('Overpass runtime error')
    return { elements: [] }
  }

  try {
    return JSON.parse(text) as OsmResponse
  } catch {
    console.warn('Overpass returned non-JSON response')
    return { elements: [] }
  }
}

function bboxAround(lat: number, lng: number): [number, number, number, number] {
  return [
    lat - BBOX_PAD_DEG,
    lng - BBOX_PAD_DEG,
    lat + BBOX_PAD_DEG,
    lng + BBOX_PAD_DEG,
  ]
}

function parseOsmElements(
  elements: OsmElement[],
  holeCount: number
): CourseGpsPayload | null {
  const holeWays = elements.filter((e) => e.tags?.golf === 'hole' && e.geometry?.length)
  const teeWays = elements.filter((e) => e.tags?.golf === 'tee' && e.geometry?.length)
  const greenWays = elements.filter((e) => e.tags?.golf === 'green' && e.geometry?.length)

  if (holeWays.length === 0 && greenWays.length === 0) {
    return null
  }

  const holes: HoleGps[] = []

  const sortedHoleWays = [...holeWays].sort((a, b) => {
    const na = parseHoleNumber(a.tags) ?? 99
    const nb = parseHoleNumber(b.tags) ?? 99
    return na - nb
  })

  for (const holeWay of sortedHoleWays) {
    const holeNumber = parseHoleNumber(holeWay.tags)
    if (holeNumber == null) continue

    const nodes = wayNodes(holeWay)
    const endpoints = wayEndpoints(nodes)
    if (!endpoints) continue

    const tee =
      nearestFeature(endpoints.start, teeWays, 120) ?? endpoints.start
    const greenRef =
      nearestFeature(endpoints.end, greenWays, 150) ?? endpoints.end

    const matchedGreen = greenWays.find((g) => {
      const centroid = wayNodes(g)
      if (centroid.length === 0) return false
      const c = {
        latitude:
          centroid.reduce((s, n) => s + n.latitude, 0) / centroid.length,
        longitude:
          centroid.reduce((s, n) => s + n.longitude, 0) / centroid.length,
      }
      return (
        haversineDistanceMeters(
          c.latitude,
          c.longitude,
          greenRef.latitude,
          greenRef.longitude
        ) < 80
      )
    })

    const greenNodes = matchedGreen ? wayNodes(matchedGreen) : [endpoints.end]
    holes.push(buildHoleGps(holeNumber, tee, greenNodes, endpoints.end))
  }

  // Fallback: match greens by ref tag when hole ways are missing
  if (holes.length === 0 && greenWays.length > 0) {
    for (const green of greenWays) {
      const holeNumber = parseHoleNumber(green.tags)
      if (holeNumber == null) continue
      const greenNodes = wayNodes(green)
      if (greenNodes.length === 0) continue
      const greenCenter = {
        latitude:
          greenNodes.reduce((s, n) => s + n.latitude, 0) / greenNodes.length,
        longitude:
          greenNodes.reduce((s, n) => s + n.longitude, 0) / greenNodes.length,
      }
      const tee =
        nearestFeature(greenCenter, teeWays, 400) ??
        destinationPointApprox(greenCenter, 180, 150)
      holes.push(buildHoleGps(holeNumber, tee, greenNodes, greenCenter))
    }
  }

  if (holes.length < Math.min(9, holeCount)) {
    return null
  }

  holes.sort((a, b) => a.holeNumber - b.holeNumber)

  return {
    holes,
    holeCount: Math.max(holeCount, holes.length),
    source: 'osm',
    sourceVersion: 'overpass-v1',
  }
}

/** Rough offset when tee is unknown — ~150 yds from green opposite default bearing. */
function destinationPointApprox(from: LatLng, bearingDeg: number, yards: number): LatLng {
  return destinationPoint(from, bearingDeg, yards * 0.9144)
}

async function fetchOsmCourseGps(ctx: CourseGpsContext): Promise<CourseGpsPayload | null> {
  if (!hasCoordinates(ctx)) return null

  const lat = ctx.latitude!
  const lng = ctx.longitude!
  const holeCount = ctx.holeCount ?? 18

  const courseSearch = await overpassQuery(`
    [out:json][timeout:90];
    (
      way["leisure"="golf_course"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
      relation["leisure"="golf_course"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
    );
    out center tags;
  `)

  let bestLat = lat
  let bestLng = lng
  let bestScore = -1

  for (const el of courseSearch.elements) {
    const name = el.tags?.name ?? el.tags?.['club:name'] ?? ''
    const score = nameSimilarity(name, ctx.courseName)
    const center = el.center ?? (el.lat != null ? { lat: el.lat, lon: el.lon! } : null)
    if (!center) continue
    const combined = score + (score > 0 ? 0.1 : 0)
    if (combined > bestScore) {
      bestScore = combined
      bestLat = center.lat
      bestLng = center.lon
    }
  }

  const [south, west, north, east] = bboxAround(bestLat, bestLng)
  const featureQuery = await overpassQuery(`
    [out:json][timeout:90];
    (
      way["golf"="hole"](${south},${west},${north},${east});
      way["golf"="tee"](${south},${west},${north},${east});
      way["golf"="green"](${south},${west},${north},${east});
      relation["golf"="hole"](${south},${west},${north},${east});
    );
    out geom;
  `)

  return parseOsmElements(featureQuery.elements, holeCount)
}

export const osmGpsProvider: GpsDataProvider = {
  id: 'osm',
  priority: 100,
  canFetch: hasCoordinates,
  fetch: fetchOsmCourseGps,
}

export function osmCacheKeyFor(ctx: CourseGpsContext): string {
  return buildCourseGpsCacheKey(ctx)
}
