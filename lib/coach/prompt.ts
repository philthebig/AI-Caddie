import { COACH_CHAT_SYSTEM_RULES } from '@/lib/coach/context'
import { formatDrillsForPrompt } from '@/lib/coach/drills'
import type { CoachPayload } from '@/lib/coach/payload'
import type { CoachMode } from '@/lib/coach/types'

const STRUCTURED_OUTPUT_RULES = `
OUTPUT RULES (structured JSON):
- Use ONLY computed Strokes Gained numbers and miss-pattern data from the payload. Never invent stats.
- primaryFocus.category must be one of: OTT, APP, ARG, PUTT — pick the category with the worst (most negative) SG unless evidence clearly points elsewhere.
- strokesCost and primaryFocus.strokesCost must reflect the SG figures provided (round to one decimal).
- evidenceHoles and primaryFocus.evidenceHoles must list specific hole numbers from the data (e.g. blow-up holes, repeated miss segments).
- drill.id and drill.name MUST come from the APPROVED DRILLS list below — copy id and name exactly; adapt description briefly if needed.
- secondaryFocus: set to null unless a second clear pattern exists in the data.
- drill.duration: set to null if the chosen drill has no duration in the approved list.
- encouragement: one short, genuine sentence — not generic fluff.
`.trim()

function modeInstructions(mode: CoachMode, payload: CoachPayload): string {
  switch (mode) {
    case 'post_round':
      return `
Analyze this completed round. Identify the single biggest strokes-lost category backed by SG and miss patterns.
Write a 2–3 sentence summary citing numeric SG and specific holes.
Primary focus title format example: "Approach play (−2.4 SG APP)".
`.trim()
    case 'quick_tip':
      return `
Give ONE actionable caddie tip for the next hole or next few holes based on today's patterns so far.
Keep summary to 1 sentence. primaryFocus.detail should be the tip itself.
`.trim()
    case 'hole_recap':
      return `
Recap the focus hole (H${payload.holeNumber ?? '?'}) in context of the round so far.
What went wrong or right? One adjustment for the next hole.
`.trim()
    case 'weekly_focus':
      return `
Using recent rounds plus today's round, identify the persistent pattern costing the most strokes over time.
Headline the primary focus as a weekly practice theme (not just today's round).
Reference trends from recent rounds when available.
`.trim()
  }
}

export function buildCoachPrompt(payload: CoachPayload): string {
  const sg = payload.strokesGained
  const sgSummary = [
    `OTT: ${sg.ott >= 0 ? '+' : ''}${sg.ott.toFixed(1)}`,
    `APP: ${sg.app >= 0 ? '+' : ''}${sg.app.toFixed(1)}`,
    `ARG: ${sg.arg >= 0 ? '+' : ''}${sg.arg.toFixed(1)}`,
    `PUTT: ${sg.putt >= 0 ? '+' : ''}${sg.putt.toFixed(1)}`,
    `Total vs expected: ${sg.total >= 0 ? '+' : ''}${sg.total.toFixed(1)}`,
  ].join(' | ')

  return [
    COACH_CHAT_SYSTEM_RULES,
    '',
    STRUCTURED_OUTPUT_RULES,
    '',
    `--- Mode: ${payload.mode} ---`,
    modeInstructions(payload.mode, payload),
    '',
    `Worst SG categories (priority order): ${payload.priorityCategories.join(' → ')}`,
    `Round SG snapshot: ${sgSummary}`,
    '',
    '--- APPROVED DRILLS (pick one; use exact id and name) ---',
    formatDrillsForPrompt(payload.suggestedDrills),
    '',
    '--- Round data ---',
    payload.humanSummary,
  ].join('\n')
}
