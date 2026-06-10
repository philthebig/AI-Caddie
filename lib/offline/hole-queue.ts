import type { HoleInput } from '@/lib/types/golf'

const DB_NAME = 'ai-caddie-offline'
const DB_VERSION = 1
const STORE_NAME = 'hole-queue'

export type QueuedHole = {
  /** `${roundId}:${holeNumber}` — one pending save per hole (last write wins). */
  id: string
  roundId: string
  holeNumber: number
  holeData: HoleInput
  queuedAt: number
}

function queueId(roundId: string, holeNumber: number): string {
  return `${roundId}:${holeNumber}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Failed to open offline queue'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('roundId', 'roundId', { unique: false })
      }
    }
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = fn(store)

        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
        request.onsuccess = () => resolve(request.result as T)

        tx.oncomplete = () => db.close()
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB transaction failed'))
        }
      })
  )
}

/** Queue a hole save. Overwrites any existing entry for the same round + hole. */
export async function enqueueHole(
  roundId: string,
  holeNumber: number,
  holeData: HoleInput
): Promise<void> {
  const entry: QueuedHole = {
    id: queueId(roundId, holeNumber),
    roundId,
    holeNumber,
    holeData,
    queuedAt: Date.now(),
  }

  await runTransaction('readwrite', (store) => store.put(entry))
}

export async function removeQueuedHole(roundId: string, holeNumber: number): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(queueId(roundId, holeNumber)))
}

export async function getQueuedHolesForRound(roundId: string): Promise<QueuedHole[]> {
  const all = await runTransaction<QueuedHole[]>('readonly', (store) => store.getAll())
  return all
    .filter((entry) => entry.roundId === roundId)
    .sort((a, b) => a.holeNumber - b.holeNumber)
}

export async function clearRoundQueue(roundId: string): Promise<void> {
  const pending = await getQueuedHolesForRound(roundId)
  if (pending.length === 0) return

  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        for (const entry of pending) {
          store.delete(entry.id)
        }

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Failed to clear offline queue'))
        }
      })
  )
}

/** True when the error is likely a connectivity problem (not validation). */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    return msg.includes('fetch') || msg.includes('network') || msg.includes('failed')
  }
  if (err instanceof Error && err.name === 'NetworkError') return true
  return false
}
