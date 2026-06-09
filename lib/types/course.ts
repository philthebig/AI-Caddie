import { z } from 'zod'
import { emptyHole, type HoleCount, type HoleInput } from '@/lib/types/golf'

export const courseLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

export const courseSearchResultSchema = z.object({
  id: z.number(),
  club_name: z.string(),
  course_name: z.string(),
  location: courseLocationSchema.optional(),
})

export const courseSearchResponseSchema = z.object({
  courses: z.array(courseSearchResultSchema),
})

export const apiHoleSchema = z.object({
  par: z.number().int().min(3).max(5),
  yardage: z.number().int().min(50).max(700),
  hole_number: z.number().int().min(1).max(18).optional(),
  par_number: z.number().int().min(1).max(18).optional(),
  handicap: z.number().int().optional(),
})

export const apiTeeSchema = z.object({
  tee_name: z.string(),
  total_yards: z.number().int().optional(),
  par_total: z.number().int().optional(),
  course_rating: z.number().optional(),
  slope_rating: z.number().int().optional(),
  holes: z.array(apiHoleSchema).min(1),
})

export const courseDetailSchema = z.object({
  id: z.number(),
  club_name: z.string(),
  course_name: z.string(),
  location: courseLocationSchema.optional(),
  tees: z.object({
    male: z.array(apiTeeSchema).default([]),
    female: z.array(apiTeeSchema).default([]),
  }),
})

export type CourseSearchResult = z.infer<typeof courseSearchResultSchema>
export type CourseDetail = z.infer<typeof courseDetailSchema>
export type ApiTee = z.infer<typeof apiTeeSchema>
export type ApiHole = z.infer<typeof apiHoleSchema>
export type NineSide = 'front' | 'back'

export function formatCourseLabel(course: Pick<CourseSearchResult, 'club_name' | 'course_name' | 'location'>) {
  const location = [course.location?.city, course.location?.state].filter(Boolean).join(', ')
  const name =
    course.course_name === course.club_name
      ? course.course_name
      : `${course.club_name} — ${course.course_name}`
  return location ? `${name} (${location})` : name
}

export function getTeeOptions(detail: CourseDetail): ApiTee[] {
  const seen = new Set<string>()
  const tees: ApiTee[] = []

  for (const tee of [...detail.tees.male, ...detail.tees.female]) {
    const key = tee.tee_name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      tees.push(tee)
    }
  }

  return tees.sort((a, b) => (b.total_yards ?? 0) - (a.total_yards ?? 0))
}

function holeNumber(hole: ApiHole, index: number) {
  return hole.hole_number ?? hole.par_number ?? index + 1
}

export function teeHolesToInputs(
  tee: ApiTee,
  holeCount: HoleCount,
  nineSide: NineSide = 'front'
): HoleInput[] {
  const sorted = [...tee.holes]
    .map((hole, index) => ({ hole, index }))
    .sort((a, b) => holeNumber(a.hole, a.index) - holeNumber(b.hole, b.index))
    .map(({ hole }) => hole)

  const slice =
    holeCount === 9 && sorted.length >= 18
      ? nineSide === 'front'
        ? sorted.slice(0, 9)
        : sorted.slice(9, 18)
      : sorted.slice(0, holeCount)

  return slice.map((hole, index) => ({
    ...emptyHole(index + 1, hole.par),
    yardage: hole.yardage,
  }))
}
