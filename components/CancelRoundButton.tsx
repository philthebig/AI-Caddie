'use client'

import { cancelRound } from '@/app/actions/play'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CancelRoundButtonProps = {
  roundId: string
  variant?: 'play' | 'banner'
}

export default function CancelRoundButton({
  roundId,
  variant = 'play',
}: CancelRoundButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    const result = await cancelRound(roundId)
    setCancelling(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`aicaddie-play-hole-${roundId}`)
      localStorage.removeItem(`aicaddie-play-completed-${roundId}`)
    }

    router.push('/')
    router.refresh()
  }

  const triggerClass =
    variant === 'banner'
      ? 'text-sm font-semibold text-red-700 hover:text-red-900 min-h-11 px-2 touch-manipulation'
      : 'text-sm font-semibold text-red-700 hover:text-red-900 min-h-11 touch-manipulation'

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={triggerClass}>
        Cancel round
      </button>
    )
  }

  return (
    <div
      className={
        variant === 'banner'
          ? 'rounded-lg border border-red-200 bg-red-50 p-3 space-y-2 w-full'
          : 'rounded-lg border border-red-200 bg-red-50 p-4 space-y-3'
      }
    >
      <p className="text-sm font-semibold text-red-900">
        Cancel this round? All entered scores will be discarded.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={cancelling}
          onClick={handleCancel}
          className="flex-1 min-h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 touch-manipulation"
        >
          {cancelling ? 'Cancelling…' : 'Yes, cancel round'}
        </button>
        <button
          type="button"
          disabled={cancelling}
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          className="min-h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 touch-manipulation"
        >
          Keep playing
        </button>
      </div>
    </div>
  )
}
