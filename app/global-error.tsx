'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">The app hit an unexpected error.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
