'use client'

import { deleteRound } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteRoundButton({ roundId }: { roundId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteRound(roundId)
    setDeleting(false)

    if (result?.error) {
      setError(result.error)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-12 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 touch-manipulation"
      >
        Delete round
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-red-900">
        Delete this round permanently? This cannot be undone.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={deleting}
          onClick={handleDelete}
          className="flex-1 min-h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 touch-manipulation"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            setConfirming(false)
            setError(null)
          }}
          className="min-h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 touch-manipulation"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
