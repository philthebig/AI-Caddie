import type { CourseGpsContext, CourseGpsPayload } from '@/lib/golf-course-gps/types'

export type GpsDataProvider = {
  /** Unique id, e.g. "osm", "igolf", "golfbert". */
  id: string
  /** Lower runs first when fetching fresh data. Paid providers should use 0–10. */
  priority: number
  canFetch(ctx: CourseGpsContext): boolean
  fetch(ctx: CourseGpsContext): Promise<CourseGpsPayload | null>
}
