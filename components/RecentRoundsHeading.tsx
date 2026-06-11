'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

const CLICKS_REQUIRED = 5
const CLICK_RESET_MS = 2000

export default function RecentRoundsHeading() {
  const [clickCount, setClickCount] = useState(0)
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  useEffect(() => clearResetTimer, [clearResetTimer])

  function handleRoundClick() {
    clearResetTimer()
    const next = clickCount + 1

    if (next >= CLICKS_REQUIRED) {
      setClickCount(0)
      setShowEasterEgg(true)
      return
    }

    setClickCount(next)
    resetTimerRef.current = setTimeout(() => setClickCount(0), CLICK_RESET_MS)
  }

  function closeEasterEgg() {
    setShowEasterEgg(false)
    setClickCount(0)
  }

  return (
    <>
      <h2 className="text-lg font-bold text-slate-800">
        Recent{' '}
        <button
          type="button"
          onClick={handleRoundClick}
          className="cursor-default select-none bg-transparent p-0 font-bold text-inherit"
          aria-label="Recent rounds"
        >
          round
        </button>
        s
      </h2>

      {showEasterEgg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeEasterEgg}
          role="dialog"
          aria-modal="true"
          aria-label="Les frères Stastny"
        >
          <div
            className="relative max-w-md rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeEasterEgg}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              ✕
            </button>
            <Image
              src="/stastny-brothers.png"
              alt="Les frères Stastny"
              width={600}
              height={400}
              className="w-full rounded-xl object-cover"
              priority
            />
            <p className="mt-3 text-center text-lg font-bold text-slate-800">
              Les frères Stastny
            </p>
          </div>
        </div>
      )}
    </>
  )
}
