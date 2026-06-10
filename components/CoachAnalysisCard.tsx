'use client'

import type { CoachAnalysis } from '@/lib/coach/types'

type CoachAnalysisCardProps = {
  analysis: CoachAnalysis
  generatedAt?: string
  onRegenerate?: () => void
  isRegenerating?: boolean
}

function formatStrokesCost(n: number): string {
  const abs = Math.abs(n)
  const label = abs.toFixed(1)
  return n <= 0 ? `~${label} strokes lost vs expected` : `~${label} strokes gained vs expected`
}

function formatEvidenceHoles(holes: number[]): string {
  return holes.map((h) => `H${h}`).join(', ')
}

export default function CoachAnalysisCard({
  analysis,
  generatedAt,
  onRegenerate,
  isRegenerating = false,
}: CoachAnalysisCardProps) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-bold text-indigo-900 text-sm">AI Caddie Analysis</h4>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline disabled:opacity-50 shrink-0"
          >
            {isRegenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        )}
      </div>

      <p className="text-indigo-900 text-sm leading-relaxed">{analysis.summary}</p>

      <div className="rounded-lg bg-white/70 border border-indigo-100 p-3 space-y-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 mb-0.5">
            Primary focus
          </p>
          <p className="text-sm font-semibold text-indigo-900">{analysis.primaryFocus.title}</p>
          <p className="text-xs text-indigo-700 mt-1">
            {formatEvidenceHoles(analysis.primaryFocus.evidenceHoles)} — {analysis.primaryFocus.detail}
          </p>
        </div>

        <p className="text-xs font-medium text-indigo-800">{formatStrokesCost(analysis.strokesCost)}</p>

        {analysis.secondaryFocus && (
          <div className="pt-2 border-t border-indigo-100">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500 mb-0.5">
              Also watch
            </p>
            <p className="text-xs text-indigo-800">
              {analysis.secondaryFocus.title} — {analysis.secondaryFocus.detail}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Drill</p>
        <p className="text-sm font-semibold text-emerald-900">{analysis.drill.name}</p>
        <p className="text-xs text-emerald-800 mt-1">{analysis.drill.description}</p>
        {analysis.drill.duration && (
          <p className="text-[10px] text-emerald-600 mt-1">{analysis.drill.duration}</p>
        )}
      </div>

      <p className="text-sm text-indigo-700 italic">{analysis.encouragement}</p>

      {generatedAt && (
        <p className="text-[10px] text-indigo-400">
          Generated {new Date(generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
