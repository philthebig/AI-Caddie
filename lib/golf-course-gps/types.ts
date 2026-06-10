import { z } from 'zod'

export const latLngSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type LatLng = z.infer<typeof latLngSchema>

export const greenPositionsSchema = z.object({
  front: latLngSchema,
  center: latLngSchema,
  back: latLngSchema,
})

export const holeGpsSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  tee: latLngSchema,
  green: greenPositionsSchema,
})

export type HoleGps = z.infer<typeof holeGpsSchema>

export const gpsSourceSchema = z.enum([
  'osm',
  'manual',
  'igolf',
  'golfbert',
  'golfintelligence',
])

export type GpsSource = z.infer<typeof gpsSourceSchema>

export const courseGpsPayloadSchema = z.object({
  holes: z.array(holeGpsSchema).min(1),
  holeCount: z.number().int().min(9).max(18),
  source: gpsSourceSchema,
  sourceVersion: z.string().optional(),
})

export type CourseGpsPayload = z.infer<typeof courseGpsPayloadSchema>

export type CourseGpsContext = {
  externalCourseId?: number | null
  courseName: string
  latitude?: number | null
  longitude?: number | null
  holeCount?: number
}

export type CourseGpsResult = {
  payload: CourseGpsPayload | null
  source: GpsSource | null
  fromCache: boolean
  cacheKey: string
}

export function getHoleGps(
  payload: CourseGpsPayload | null | undefined,
  holeNumber: number
): HoleGps | null {
  if (!payload) return null
  return payload.holes.find((h) => h.holeNumber === holeNumber) ?? null
}
