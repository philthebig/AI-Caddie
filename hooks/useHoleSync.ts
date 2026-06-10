'use client'

import { saveHole } from '@/app/actions/play'
import {
  clearRoundQueue,
  enqueueHole,
  getQueuedHolesForRound,
  isNetworkError,
  removeQueuedHole,
  type QueuedHole,
} from '@/lib/offline/hole-queue'
import type { HoleInput } from '@/lib/types/golf'
import { useCallback, useEffect, useRef, useState } from 'react'

export type HoleSyncStatus = 'synced' | 'pending' | 'failed'

type UseHoleSyncOptions = {
  roundId: string
  onHydrate?: (queuedHoles: QueuedHole[]) => void
}

type PersistResult = { ok: true } | { error: string }

type FlushResult = { ok: true } | { error: string }

/**
 * Offline-aware hole persistence.
 *
 * Conflict policy: last-write-wins on the client. Queued payloads sync via
 * `saveHole`, which upserts by roundId + holeNumber (idempotent — no duplicates).
 */
export function useHoleSync({ roundId, onHydrate }: UseHoleSyncOptions) {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine
  )
  const [syncing, setSyncing] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pendingHoleNumbers, setPendingHoleNumbers] = useState<Set<number>>(() => new Set())
  const [failedHoleNumbers, setFailedHoleNumbers] = useState<Set<number>>(() => new Set())

  const flushInFlight = useRef(false)
  const onHydrateRef = useRef(onHydrate)
  onHydrateRef.current = onHydrate

  const loadQueue = useCallback(async () => {
    try {
      const queued = await getQueuedHolesForRound(roundId)
      setPendingHoleNumbers(new Set(queued.map((q) => q.holeNumber)))
      onHydrateRef.current?.(queued)
    } catch (err) {
      console.error('Failed to load offline hole queue:', err)
    } finally {
      setHydrated(true)
    }
  }, [roundId])

  const markSynced = useCallback((holeNumber: number) => {
    setPendingHoleNumbers((prev) => {
      if (!prev.has(holeNumber)) return prev
      const next = new Set(prev)
      next.delete(holeNumber)
      return next
    })
    setFailedHoleNumbers((prev) => {
      if (!prev.has(holeNumber)) return prev
      const next = new Set(prev)
      next.delete(holeNumber)
      return next
    })
  }, [])

  const markPending = useCallback((holeNumber: number) => {
    setPendingHoleNumbers((prev) => new Set(prev).add(holeNumber))
    setFailedHoleNumbers((prev) => {
      if (!prev.has(holeNumber)) return prev
      const next = new Set(prev)
      next.delete(holeNumber)
      return next
    })
  }, [])

  const markFailed = useCallback((holeNumber: number) => {
    setFailedHoleNumbers((prev) => new Set(prev).add(holeNumber))
  }, [])

  const flushQueue = useCallback(async (): Promise<FlushResult> => {
    if (flushInFlight.current) return { ok: true }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { error: 'You are offline. Holes will sync when you reconnect.' }
    }

    flushInFlight.current = true
    setSyncing(true)

    try {
      const queued = await getQueuedHolesForRound(roundId)
      if (queued.length === 0) return { ok: true }

      for (const entry of queued) {
        try {
          const result = await saveHole(roundId, entry.holeNumber, entry.holeData)
          if (result?.error) {
            markFailed(entry.holeNumber)
            return { error: result.error }
          }
          await removeQueuedHole(roundId, entry.holeNumber)
          markSynced(entry.holeNumber)
        } catch (err) {
          if (isNetworkError(err)) {
            return { error: 'Connection lost while syncing. Will retry when online.' }
          }
          console.error('flushQueue failed:', err)
          markFailed(entry.holeNumber)
          return { error: 'Could not sync a hole. Please try again.' }
        }
      }

      const remaining = await getQueuedHolesForRound(roundId)
      if (remaining.length > 0) {
        return {
          error: `${remaining.length} hole${remaining.length === 1 ? '' : 's'} still waiting to sync.`,
        }
      }

      return { ok: true }
    } catch (err) {
      console.error('flushQueue failed:', err)
      return { error: 'Could not read the offline queue.' }
    } finally {
      flushInFlight.current = false
      setSyncing(false)
    }
  }, [roundId, markFailed, markSynced])

  const persistHole = useCallback(
    async (holeNumber: number, holeData: HoleInput): Promise<PersistResult> => {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine

      if (offline) {
        try {
          await enqueueHole(roundId, holeNumber, holeData)
          markPending(holeNumber)
          return { ok: true }
        } catch (err) {
          console.error('enqueueHole failed:', err)
          return { error: 'Could not save this hole offline.' }
        }
      }

      try {
        const result = await saveHole(roundId, holeNumber, holeData)
        if (result?.error) {
          return { error: result.error }
        }
        await removeQueuedHole(roundId, holeNumber).catch(() => {})
        markSynced(holeNumber)
        return { ok: true }
      } catch (err) {
        if (!isNetworkError(err)) {
          console.error('persistHole failed:', err)
          return { error: 'Could not save this hole. Please try again.' }
        }

        try {
          await enqueueHole(roundId, holeNumber, holeData)
          markPending(holeNumber)
          return { ok: true }
        } catch (queueErr) {
          console.error('enqueueHole after network failure:', queueErr)
          return { error: 'Could not save this hole. Check your connection.' }
        }
      }
    },
    [roundId, markPending, markSynced]
  )

  const getHoleStatus = useCallback(
    (holeNumber: number): HoleSyncStatus => {
      if (failedHoleNumbers.has(holeNumber)) return 'failed'
      if (pendingHoleNumbers.has(holeNumber)) return 'pending'
      return 'synced'
    },
    [failedHoleNumbers, pendingHoleNumbers]
  )

  const retryFailed = useCallback(async (): Promise<FlushResult> => {
    return flushQueue()
  }, [flushQueue])

  const clearQueue = useCallback(async () => {
    await clearRoundQueue(roundId)
    setPendingHoleNumbers(new Set())
    setFailedHoleNumbers(new Set())
  }, [roundId])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      void flushQueue()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])

  useEffect(() => {
    if (!hydrated || !isOnline) return
    void flushQueue()
  }, [hydrated, isOnline, flushQueue])

  const hasPending = pendingHoleNumbers.size > 0
  const hasFailed = failedHoleNumbers.size > 0

  return {
    hydrated,
    isOnline,
    syncing,
    hasPending,
    hasFailed,
    pendingHoleNumbers,
    failedHoleNumbers,
    persistHole,
    flushQueue,
    retryFailed,
    clearQueue,
    getHoleStatus,
  }
}
