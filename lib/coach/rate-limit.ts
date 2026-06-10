import { prisma } from '@/lib/db'

export const COACH_DAILY_MESSAGE_LIMIT = 30
export const COACH_ROUND_MESSAGE_LIMIT = 15

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; limit: number }

function startOfTodayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function checkCoachChatRateLimit(
  userId: string,
  roundId?: string
): Promise<RateLimitResult> {
  const since = startOfTodayUtc()

  const dailyCount = await prisma.coachMessage.count({
    where: {
      userId,
      role: 'USER',
      createdAt: { gte: since },
    },
  })

  if (dailyCount >= COACH_DAILY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      reason: 'daily',
      limit: COACH_DAILY_MESSAGE_LIMIT,
    }
  }

  if (roundId) {
    const roundCount = await prisma.coachMessage.count({
      where: {
        userId,
        roundId,
        role: 'USER',
      },
    })

    if (roundCount >= COACH_ROUND_MESSAGE_LIMIT) {
      return {
        allowed: false,
        reason: 'round',
        limit: COACH_ROUND_MESSAGE_LIMIT,
      }
    }
  }

  return { allowed: true }
}
