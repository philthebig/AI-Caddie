import { parseStoredCoachFeedback } from '@/lib/coach/analysis'
import { computeRoundAggregates } from '@/lib/golf-logic/aggregate'
import { computeRoundStrokesGained } from '@/lib/golf-logic/strokes-gained'
import type { Hole, Round, User } from '@prisma/client'

export type ShareCardData = {
  courseName: string
  date: string
  teeName: string | null
  totalScore: number
  scoreVsPar: number | null
  coachHeadline: string | null
  sg: {
    ott: number
    app: number
    arg: number
    putt: number
    total: number
  } | null
  playerName: string
  playerAvatarUrl: string | null
}

type RoundWithHoles = Round & { holes: Hole[] }

export function buildShareCardData(
  round: RoundWithHoles,
  player: Pick<User, 'name' | 'username'>,
  options: {
    includeCoachHeadline: boolean
    playerDisplayName?: string
    playerAvatarUrl?: string | null
  }
): ShareCardData {
  const aggregates = computeRoundAggregates(round.holes, round.coursePar)
  const scoreVsPar =
    aggregates.coursePar != null ? round.totalScore - aggregates.coursePar : null
  const sg = round.holes.length > 0 ? computeRoundStrokesGained(round.holes) : null

  let coachHeadline: string | null = null
  if (options.includeCoachHeadline && round.aiFeedback) {
    const stored = parseStoredCoachFeedback(round.aiFeedback)
    coachHeadline = stored?.analysis.summary ?? round.aiFeedback.slice(0, 200)
  }

  const playerName =
    options.playerDisplayName ??
    (player.name?.trim() || (player.username ? `@${player.username}` : 'Golfer'))

  return {
    courseName: round.courseName,
    date: round.date.toISOString(),
    teeName: round.teeName,
    totalScore: round.totalScore,
    scoreVsPar,
    coachHeadline,
    sg: sg
      ? { ott: sg.ott, app: sg.app, arg: sg.arg, putt: sg.putt, total: sg.total }
      : null,
    playerName,
    playerAvatarUrl: options.playerAvatarUrl ?? null,
  }
}

export function formatScoreVsPar(scoreVsPar: number | null): string {
  if (scoreVsPar == null) return ''
  if (scoreVsPar === 0) return 'E'
  return scoreVsPar > 0 ? `+${scoreVsPar}` : String(scoreVsPar)
}

export function generateShareToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
