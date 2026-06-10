import type { GpsDataProvider } from '@/lib/golf-course-gps/providers/types'
import type { CourseGpsContext, CourseGpsPayload } from '@/lib/golf-course-gps/types'

/**
 * Paid GPS providers (iGolf, Golfbert, Golf Intelligence) plug in here.
 *
 * Set env:
 *   GOLF_GPS_PROVIDER=igolf|golfbert|golfintelligence
 *   GOLF_GPS_API_KEY=...
 *   GOLF_GPS_API_SECRET=...   (providers that need AWS-style signing)
 *
 * Implement fetchFromIgolf / fetchFromGolfbert when keys are available.
 * Until then, this module is a no-op stub so the resolver can stay unchanged.
 */

type PaidProviderId = 'igolf' | 'golfbert' | 'golfintelligence'

function configuredProvider(): PaidProviderId | null {
  const raw = process.env.GOLF_GPS_PROVIDER?.trim().toLowerCase()
  if (raw === 'igolf' || raw === 'golfbert' || raw === 'golfintelligence') {
    return raw
  }
  return null
}

function hasApiKey(): boolean {
  return Boolean(process.env.GOLF_GPS_API_KEY?.trim())
}

async function fetchFromPaidProvider(
  provider: PaidProviderId,
  _ctx: CourseGpsContext
): Promise<CourseGpsPayload | null> {
  // TODO: wire real HTTP clients when commercial keys are available.
  console.info(
    `[course-gps] GOLF_GPS_PROVIDER=${provider} is set but paid fetch is not implemented yet.`
  )
  return null
}

function createPaidProvider(id: PaidProviderId): GpsDataProvider {
  return {
    id,
    priority: 10,
    canFetch: () => hasApiKey(),
    fetch: (ctx) => fetchFromPaidProvider(id, ctx),
  }
}

/** Returns the configured paid provider, or null when env is unset. */
export function getPaidGpsProvider(): GpsDataProvider | null {
  const id = configuredProvider()
  if (!id || !hasApiKey()) return null
  return createPaidProvider(id)
}
