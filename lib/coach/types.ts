import { z } from 'zod'

export const COACH_MODES = ['post_round', 'quick_tip', 'hole_recap', 'weekly_focus'] as const
export type CoachMode = (typeof COACH_MODES)[number]

export const SG_CATEGORIES = ['OTT', 'APP', 'ARG', 'PUTT'] as const
export type SgCategory = (typeof SG_CATEGORIES)[number]

export const coachFocusSchema = z.object({
  category: z.enum(SG_CATEGORIES),
  title: z.string(),
  strokesCost: z.number(),
  evidenceHoles: z.array(z.number().int().min(1).max(18)),
  detail: z.string(),
})

export const coachDrillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // OpenAI structured output rejects .optional(); use null when not applicable.
  duration: z.string().nullable().default(null),
})

export const coachAnalysisSchema = z.object({
  summary: z.string(),
  primaryFocus: coachFocusSchema,
  secondaryFocus: coachFocusSchema.nullable().default(null),
  strokesCost: z.number(),
  evidenceHoles: z.array(z.number().int().min(1).max(18)),
  drill: coachDrillSchema,
  encouragement: z.string(),
})

export type CoachFocus = z.infer<typeof coachFocusSchema>
export type CoachDrill = z.infer<typeof coachDrillSchema>
export type CoachAnalysis = z.infer<typeof coachAnalysisSchema>

export const COACH_ANALYSIS_VERSION = 1

export type StoredCoachFeedback = {
  version: typeof COACH_ANALYSIS_VERSION
  mode: CoachMode
  generatedAt: string
  analysis: CoachAnalysis
}

export type CoachRequestBody = {
  roundId: string
  mode?: CoachMode
  regenerate?: boolean
  holeNumber?: number
}

export type CoachResponseBody = {
  feedback: StoredCoachFeedback
  cached: boolean
}
