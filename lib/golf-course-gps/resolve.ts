import { buildCourseGpsCacheKey } from '@/lib/golf-course-gps/cache-key'
import { getGpsFetchProviders } from '@/lib/golf-course-gps/providers'
import {
  courseGpsPayloadSchema,
  type CourseGpsContext,
  type CourseGpsPayload,
  type CourseGpsResult,
  type GpsSource,
} from '@/lib/golf-course-gps/types'
import { prisma } from '@/lib/db'

const MANUAL_SOURCE: GpsSource = 'manual'

/** Stale dev servers may lack CourseGpsCache until `prisma generate` + restart. */
function courseGpsCacheDelegate() {
  return (
    prisma as unknown as {
      courseGpsCache?: {
        findUnique: (args: {
          where: { cacheKey: string }
        }) => Promise<{ payload: unknown } | null>
        upsert: (args: {
          where: { cacheKey: string }
          create: Record<string, unknown>
          update: Record<string, unknown>
        }) => Promise<unknown>
      }
    }
  ).courseGpsCache
}

function parseCachedPayload(raw: unknown): CourseGpsPayload | null {
  const parsed = courseGpsPayloadSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

async function readCache(cacheKey: string): Promise<{
  payload: CourseGpsPayload
  source: GpsSource
} | null> {
  const cache = courseGpsCacheDelegate()
  if (!cache) {
    console.warn(
      '[course-gps] CourseGpsCache unavailable — run `npx prisma generate` and restart the dev server.'
    )
    return null
  }
  const row = await cache.findUnique({ where: { cacheKey } })
  if (!row) return null
  const payload = parseCachedPayload(row.payload)
  if (!payload) return null
  return { payload, source: payload.source }
}

async function writeCache(
  cacheKey: string,
  ctx: CourseGpsContext,
  payload: CourseGpsPayload
): Promise<void> {
  const cache = courseGpsCacheDelegate()
  if (!cache) {
    console.warn(
      '[course-gps] CourseGpsCache unavailable — run `npx prisma generate` and restart the dev server.'
    )
    return
  }
  await cache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      externalCourseId: ctx.externalCourseId ?? null,
      courseName: ctx.courseName,
      payload,
      source: payload.source,
    },
    update: {
      externalCourseId: ctx.externalCourseId ?? null,
      courseName: ctx.courseName,
      payload,
      source: payload.source,
    },
  })
}

export type ResolveCourseGpsOptions = {
  /** When true, try external providers even if cache exists (never overwrites manual). */
  forceRefresh?: boolean
  /** When true, only read DB cache — no external provider calls (fast server render). */
  cacheOnly?: boolean
}

/**
 * Resolve hole-level GPS for a course.
 * Order: DB cache → paid provider (if configured) → OpenStreetMap → null.
 * Manual calibrations are never auto-overwritten.
 */
export async function resolveCourseGps(
  ctx: CourseGpsContext,
  options: ResolveCourseGpsOptions = {}
): Promise<CourseGpsResult> {
  const cacheKey = buildCourseGpsCacheKey(ctx)
  const cached = await readCache(cacheKey)

  if (cached?.source === MANUAL_SOURCE) {
    return {
      payload: cached.payload,
      source: cached.source,
      fromCache: true,
      cacheKey,
    }
  }

  if (cached && !options.forceRefresh) {
    return {
      payload: cached.payload,
      source: cached.source,
      fromCache: true,
      cacheKey,
    }
  }

  if (options.cacheOnly) {
    return { payload: null, source: null, fromCache: false, cacheKey }
  }

  for (const provider of getGpsFetchProviders()) {
    if (!provider.canFetch(ctx)) continue
    try {
      const payload = await provider.fetch(ctx)
      if (!payload) continue
      await writeCache(cacheKey, ctx, payload)
      return {
        payload,
        source: payload.source,
        fromCache: false,
        cacheKey,
      }
    } catch (err) {
      console.warn(`[course-gps] provider ${provider.id} failed:`, err)
    }
  }

  if (cached) {
    return {
      payload: cached.payload,
      source: cached.source,
      fromCache: true,
      cacheKey,
    }
  }

  return { payload: null, source: null, fromCache: false, cacheKey }
}

export async function saveManualCourseGps(
  ctx: CourseGpsContext,
  payload: Omit<CourseGpsPayload, 'source'>
): Promise<CourseGpsResult> {
  const cacheKey = buildCourseGpsCacheKey(ctx)
  const full: CourseGpsPayload = { ...payload, source: MANUAL_SOURCE }
  const validated = courseGpsPayloadSchema.parse(full)
  await writeCache(cacheKey, ctx, validated)
  return {
    payload: validated,
    source: MANUAL_SOURCE,
    fromCache: false,
    cacheKey,
  }
}
