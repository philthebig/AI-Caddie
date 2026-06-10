import { getPaidGpsProvider } from '@/lib/golf-course-gps/providers/paid'
import { osmGpsProvider } from '@/lib/golf-course-gps/providers/osm'
import type { GpsDataProvider } from '@/lib/golf-course-gps/providers/types'

/** Active fetch providers, highest priority (lowest number) first. */
export function getGpsFetchProviders(): GpsDataProvider[] {
  const providers: GpsDataProvider[] = []
  const paid = getPaidGpsProvider()
  if (paid) providers.push(paid)
  providers.push(osmGpsProvider)
  return providers.sort((a, b) => a.priority - b.priority)
}
