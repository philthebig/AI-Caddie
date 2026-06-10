import {
  COACH_ANALYSIS_VERSION,
  coachAnalysisSchema,
  type CoachAnalysis,
  type CoachMode,
  type StoredCoachFeedback,
} from '@/lib/coach/types'

export function serializeCoachFeedback(
  analysis: CoachAnalysis,
  mode: CoachMode
): string {
  const stored: StoredCoachFeedback = {
    version: COACH_ANALYSIS_VERSION,
    mode,
    generatedAt: new Date().toISOString(),
    analysis,
  }
  return JSON.stringify(stored)
}

export function parseStoredCoachFeedback(
  raw: string | null | undefined
): StoredCoachFeedback | null {
  if (!raw?.trim()) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      parsed.version === COACH_ANALYSIS_VERSION &&
      'analysis' in parsed
    ) {
      const result = parsed as StoredCoachFeedback
      const validated = coachAnalysisSchema.safeParse(result.analysis)
      if (validated.success) {
        return { ...result, analysis: validated.data }
      }
    }
  } catch {
    // Legacy plain-text feedback
  }

  return null
}

/** Plain-text fallback for legacy aiFeedback or chat context. */
export function formatCoachAnalysisAsText(analysis: CoachAnalysis): string {
  const holes = analysis.evidenceHoles.map((h) => `H${h}`).join(', ')
  const secondary = analysis.secondaryFocus
    ? `\nAlso watch: ${analysis.secondaryFocus.title} — ${analysis.secondaryFocus.detail}`
    : ''

  return [
    analysis.summary,
    '',
    `Primary focus: ${analysis.primaryFocus.title}`,
    `Evidence: ${holes} — ${analysis.primaryFocus.detail}`,
    `Cost: ~${Math.abs(analysis.strokesCost).toFixed(1)} stroke${Math.abs(analysis.strokesCost) === 1 ? '' : 's'} vs expected today`,
    `Drill: ${analysis.drill.name} — ${analysis.drill.description}`,
    secondary,
    '',
    analysis.encouragement,
  ]
    .filter(Boolean)
    .join('\n')
}

export function getCoachDisplaySummary(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null

  const stored = parseStoredCoachFeedback(raw)
  if (stored) return stored.analysis.summary

  return raw.trim()
}

export function validateCoachAnalysis(data: unknown): CoachAnalysis | null {
  const result = coachAnalysisSchema.safeParse(data)
  return result.success ? result.data : null
}
