'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export default function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (!isStandalone() && isIos()) {
      const key = 'ai-caddie-ios-install-dismissed'
      if (!sessionStorage.getItem(key)) setShowIosHint(true)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setDismissed(true)
  }

  function dismiss() {
    setDismissed(true)
    setShowIosHint(false)
    sessionStorage.setItem('ai-caddie-ios-install-dismissed', '1')
  }

  if (dismissed || isStandalone()) return null

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg safe-bottom">
        <p className="text-sm font-semibold text-slate-800">Install AI Caddie</p>
        <p className="text-xs text-slate-500 mt-1">
          Add to your home screen for quick on-course access.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 min-h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 touch-manipulation"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="min-h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 touch-manipulation"
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  if (showIosHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-lg safe-bottom">
        <p className="text-sm font-semibold text-slate-800">Add to Home Screen</p>
        <p className="text-xs text-slate-500 mt-1">
          Tap Share, then &ldquo;Add to Home Screen&rdquo; for a full-screen app on the course.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full min-h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 touch-manipulation"
        >
          Got it
        </button>
      </div>
    )
  }

  return null
}
