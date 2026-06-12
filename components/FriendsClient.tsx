'use client'

import UserAvatar from '@/components/UserAvatar'
import {
  isValidUsername,
  normalizeUsername,
  sanitizeUsernameInput,
  USERNAME_HINT,
} from '@/lib/social/username'
import { useCallback, useEffect, useState } from 'react'

type FriendItem = {
  id: string
  status: string
  isIncoming: boolean
  friend: {
    id: string
    displayName: string
    avatarUrl: string | null
    username: string | null
  }
}

type SearchUser = {
  id: string
  username: string | null
  displayName: string
  avatarUrl: string | null
}

export default function FriendsClient({ initialUsername }: { initialUsername: string | null }) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [usernameInput, setUsernameInput] = useState(initialUsername ?? '')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const [friendships, setFriendships] = useState<FriendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  const loadFriendships = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/friends')
      if (!res.ok) return
      const data = await res.json()
      setFriendships(data.friendships ?? [])
      if (data.username) {
        setUsername(data.username)
        setUsernameInput(data.username)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFriendships()
  }, [loadFriendships])

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/social/users/search?q=${encodeURIComponent(searchQuery.trim())}`
        )
        if (!res.ok) return
        const data = await res.json()
        setSearchResults(data.users ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault()
    setUsernameError(null)

    const normalized = normalizeUsername(usernameInput)
    if (!isValidUsername(normalized)) {
      setUsernameError(USERNAME_HINT)
      return
    }

    setUsernameSaving(true)
    try {
      const res = await fetch('/api/social/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalized }),
      })
      const raw = await res.text()
      let data: { error?: string; username?: string }
      try {
        data = JSON.parse(raw) as { error?: string; username?: string }
      } catch {
        throw new Error('Server error saving username. Refresh the page and try again.')
      }
      if (!res.ok) throw new Error(data.error ?? 'Could not save username')
      const saved = data.username ?? normalized
      setUsername(saved)
      setUsernameInput(saved)
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Could not save username')
    } finally {
      setUsernameSaving(false)
    }
  }

  async function friendshipAction(friendshipId: string, action: string) {
    setActionError(null)
    const res = await fetch('/api/social/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId, action }),
    })
    const data = await res.json()
    if (!res.ok) {
      setActionError(data.error ?? 'Action failed')
      return
    }
    await loadFriendships()
  }

  async function sendRequest(targetUsername: string) {
    if (!username) {
      setActionError('Set your username first so friends can find you')
      return
    }
    setActionError(null)
    const res = await fetch('/api/social/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetUsername }),
    })
    const data = await res.json()
    if (!res.ok) {
      setActionError(data.error ?? 'Could not send request')
      return
    }
    setSearchQuery('')
    setSearchResults([])
    await loadFriendships()
  }

  async function removeFriend(friendshipId: string) {
    setActionError(null)
    const res = await fetch(`/api/social/friends?friendshipId=${friendshipId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? 'Could not remove friend')
      return
    }
    await loadFriendships()
  }

  const accepted = friendships.filter((f) => f.status === 'ACCEPTED')
  const pendingIncoming = friendships.filter((f) => f.status === 'PENDING' && f.isIncoming)
  const pendingOutgoing = friendships.filter((f) => f.status === 'PENDING' && !f.isIncoming)

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Your username</h2>
        <p className="text-sm text-slate-600">
          Friends search by username. Coaching chat stays private — friends only see what you share.
        </p>
        <form noValidate onSubmit={(e) => void saveUsername(e)} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                @
              </span>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={usernameInput}
                onChange={(e) => setUsernameInput(sanitizeUsernameInput(e.target.value))}
                placeholder="your_handle"
                aria-describedby="username-hint"
                className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm"
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              disabled={usernameSaving || !usernameInput.trim()}
              className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {usernameSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p id="username-hint" className="text-xs text-slate-500">
            {USERNAME_HINT}
          </p>
        </form>
        {username && (
          <p className="text-xs text-emerald-700 font-medium">You&apos;re @{username} on AI Caddie</p>
        )}
        {usernameError && <p className="text-sm text-red-600">{usernameError}</p>}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Find friends</h2>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username…"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        {searching && <p className="text-xs text-slate-400">Searching…</p>}
        {searchResults.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
            {searchResults.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 px-3 py-3 bg-slate-50/50 hover:bg-slate-50"
              >
                <UserAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.displayName}</p>
                  {u.username && (
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => u.username && void sendRequest(u.username)}
                  disabled={!u.username}
                  className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {actionError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading friends…</p>
      ) : (
        <>
          {pendingIncoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800">Friend requests</h2>
              {pendingIncoming.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-amber-200 p-3"
                >
                  <UserAvatar name={f.friend.displayName} avatarUrl={f.friend.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{f.friend.displayName}</p>
                    {f.friend.username && (
                      <p className="text-xs text-slate-500">@{f.friend.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void friendshipAction(f.id, 'accept')}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void friendshipAction(f.id, 'decline')}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {pendingOutgoing.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Sent requests
              </h2>
              {pendingOutgoing.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3"
                >
                  <UserAvatar name={f.friend.displayName} avatarUrl={f.friend.avatarUrl} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{f.friend.displayName}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void friendshipAction(f.id, 'cancel')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800">
              Friends {accepted.length > 0 && `(${accepted.length})`}
            </h2>
            {accepted.length === 0 ? (
              <p className="text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center">
                No friends yet — search by username above to connect.
              </p>
            ) : (
              accepted.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3"
                >
                  <UserAvatar name={f.friend.displayName} avatarUrl={f.friend.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{f.friend.displayName}</p>
                    {f.friend.username && (
                      <p className="text-xs text-slate-500">@{f.friend.username}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeFriend(f.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
