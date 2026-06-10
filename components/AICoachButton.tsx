'use client'

import CoachAnalysisCard from '@/components/CoachAnalysisCard'
import type { StoredCoachFeedback } from '@/lib/coach/types'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type AICoachButtonProps = {
  roundId: string
  /** Start coach on mount (e.g. after finishing a live round). */
  autoStart?: boolean
  /** Existing stored feedback from server */
  initialFeedback?: StoredCoachFeedback | null
  /** Legacy plain-text feedback */
  legacyFeedback?: string | null
}

export default function AICoachButton({
  roundId,
  autoStart = false,
  initialFeedback = null,
  legacyFeedback = null,
}: AICoachButtonProps) {
  const router = useRouter()
  const autoStartedRef = useRef(false)
  const [feedback, setFeedback] = useState<StoredCoachFeedback | null>(initialFeedback)
  const [legacyText, setLegacyText] = useState<string | null>(
    !initialFeedback && legacyFeedback ? legacyFeedback : null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCoach = useCallback(
    async (regenerate = false) => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId, mode: 'post_round', regenerate }),
        })

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? 'Failed to generate feedback')
        }

        const data = (await res.json()) as { feedback: StoredCoachFeedback }
        setFeedback(data.feedback)
        setLegacyText(null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setIsLoading(false)
      }
    },
    [roundId, router]
  )

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || feedback || legacyText) return
    autoStartedRef.current = true
    document.getElementById('ai-coach')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    void runCoach(false)
  }, [autoStart, feedback, legacyText, runCoach])

  if (isLoading && !feedback) {
    return (
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl" aria-busy>
        <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
          AI Caddie is analyzing…
        </h4>
        <p className="text-indigo-500 text-sm">Reviewing your round stats…</p>
      </div>
    )
  }

  if (feedback) {
    return (
      <CoachAnalysisCard
        analysis={feedback.analysis}
        generatedAt={feedback.generatedAt}
        onRegenerate={() => void runCoach(true)}
        isRegenerating={isLoading}
      />
    )
  }

  if (legacyText) {
    return (
      <div className="space-y-3">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
          <p className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap">{legacyText}</p>
        </div>
        <button
          type="button"
          onClick={() => void runCoach(true)}
          disabled={isLoading}
          className="text-sm font-semibold text-indigo-700 underline disabled:opacity-50"
        >
          {isLoading ? 'Generating structured analysis…' : 'Get updated structured analysis'}
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
        <button
          type="button"
          onClick={() => void runCoach(false)}
          className="mt-2 text-sm font-medium text-red-700 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void runCoach(false)}
      disabled={isLoading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-3.5 min-h-12 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 touch-manipulation disabled:opacity-60"
    >
      Get AI Coach Feedback ✨
    </button>
  )
}
