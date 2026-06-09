'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        An unexpected error occurred. Try again or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Dashboard
        </a>
      </div>
    </main>
  )
}
