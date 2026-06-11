'use client'

import { useCallback, useEffect, useState } from 'react'

type FriendOption = {
  id: string
  displayName: string
  username: string | null
}

type ShareRoundButtonProps = {
  roundId: string
  hasCoachFeedback: boolean
}

export default function ShareRoundButton({ roundId, hasCoachFeedback }: ShareRoundButtonProps) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<FriendOption[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [includeCoach, setIncludeCoach] = useState(hasCoachFeedback)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true)
    try {
      const res = await fetch('/api/social/friends')
      if (!res.ok) return
      const data = await res.json()
      const accepted = (data.friendships ?? [])
        .filter((f: { status: string }) => f.status === 'ACCEPTED')
        .map((f: { friend: FriendOption }) => f.friend)
      setFriends(accepted)
      if (accepted.length > 0 && !selectedFriendId) {
        setSelectedFriendId(accepted[0].id)
      }
    } finally {
      setLoadingFriends(false)
    }
  }, [selectedFriendId])

  useEffect(() => {
    if (open) void loadFriends()
  }, [open, loadFriends])

  async function shareToFriend() {
    if (!selectedFriendId) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/social/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId,
          friendId: selectedFriendId,
          includeCoachHeadline: includeCoach,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Share failed')
      setSuccess('Shared with your friend!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed')
    } finally {
      setBusy(false)
    }
  }

  async function createLink() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    setShareUrl(null)
    try {
      const res = await fetch('/api/social/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId,
          linkOnly: true,
          includeCoachHeadline: includeCoach,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create link')
      setShareUrl(data.shareUrl)
      setSuccess('Link ready — copy and share anywhere.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create link')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setSuccess('Link copied!')
    } catch {
      setError('Could not copy — select the link manually')
    }
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 touch-manipulation"
      >
        {open ? 'Hide share options' : 'Share round'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Friends see your score and strokes gained. Coach headline is optional — full chat
            stays private.
          </p>

          {hasCoachFeedback && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeCoach}
                onChange={(e) => setIncludeCoach(e.target.checked)}
                className="rounded border-slate-300"
              />
              Include coach headline
            </label>
          )}

          {friends.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Share in-app
              </label>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                disabled={loadingFriends}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName}
                    {f.username ? ` (@${f.username})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void shareToFriend()}
                disabled={busy || !selectedFriendId}
                className="w-full min-h-11 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-50 touch-manipulation"
              >
                Send to friend
              </button>
            </div>
          )}

          {!loadingFriends && friends.length === 0 && (
            <p className="text-sm text-slate-600">
              Add friends on the{' '}
              <a href="/friends" className="font-semibold text-emerald-700 hover:underline">
                Friends
              </a>{' '}
              page to share in-app.
            </p>
          )}

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Public link
            </label>
            <button
              type="button"
              onClick={() => void createLink()}
              disabled={busy}
              className="w-full min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-bold hover:bg-emerald-100 disabled:opacity-50 touch-manipulation"
            >
              Create share link
            </button>
            {shareUrl && (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-700 font-medium">{success}</p>}
        </div>
      )}
    </div>
  )
}
