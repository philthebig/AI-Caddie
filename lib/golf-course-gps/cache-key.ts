import type { CourseGpsContext } from '@/lib/golf-course-gps/types'

/** Stable cache key for a course — golfcourseapi id preferred, else name + coords. */
export function buildCourseGpsCacheKey(ctx: Pick<
  CourseGpsContext,
  'externalCourseId' | 'courseName' | 'latitude' | 'longitude'
>): string {
  if (ctx.externalCourseId != null && Number.isFinite(ctx.externalCourseId)) {
    return `gca:${ctx.externalCourseId}`
  }

  const name = (ctx.courseName ?? 'unknown')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

  const lat =
    ctx.latitude != null && Number.isFinite(ctx.latitude)
      ? ctx.latitude.toFixed(4)
      : '0'
  const lng =
    ctx.longitude != null && Number.isFinite(ctx.longitude)
      ? ctx.longitude.toFixed(4)
      : '0'

  return `geo:${lat},${lng}:${name || 'course'}`
}
