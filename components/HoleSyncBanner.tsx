'use client'

type HoleSyncBannerProps = {
  isOnline: boolean
  syncing: boolean
  pendingCount: number
  failedCount: number
  onRetry?: () => void
  retrying?: boolean
}

export default function HoleSyncBanner({
  isOnline,
  syncing,
  pendingCount,
  failedCount,
  onRetry,
  retrying = false,
}: HoleSyncBannerProps) {
  if (!syncing && isOnline && pendingCount === 0 && failedCount === 0) {
    return null
  }

  let message: string
  let tone: 'neutral' | 'warn' | 'error' = 'neutral'

  if (!isOnline) {
    tone = 'warn'
    message =
      pendingCount > 0
        ? `Offline · ${pendingCount} hole${pendingCount === 1 ? '' : 's'} saved locally`
        : 'Offline · scores saved on this device until you reconnect'
  } else if (syncing) {
    message = 'Syncing saved holes…'
  } else if (failedCount > 0) {
    tone = 'error'
    message = `${failedCount} hole${failedCount === 1 ? '' : 's'} failed to sync`
  } else if (pendingCount > 0) {
    tone = 'warn'
    message = `${pendingCount} hole${pendingCount === 1 ? '' : 's'} waiting to sync`
  } else {
    return null
  }

  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div
      className={`rounded-xl border px-4 py-2.5 text-sm flex items-center justify-between gap-3 ${styles}`}
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">{message}</span>
      {failedCount > 0 && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying || syncing}
          className="shrink-0 min-h-9 px-3 rounded-lg bg-white/80 border border-current/20 text-xs font-bold touch-manipulation disabled:opacity-50"
        >
          {retrying || syncing ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}
