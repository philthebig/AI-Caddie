import { prisma } from '@/lib/db'

export const FRIEND_REQUEST_DAILY_LIMIT = 20
export const SHARE_LINK_DAILY_LIMIT = 10

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; limit: number }

function startOfTodayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function checkFriendRequestRateLimit(userId: string): Promise<RateLimitResult> {
  const since = startOfTodayUtc()

  const count = await prisma.friendship.count({
    where: {
      requesterId: userId,
      createdAt: { gte: since },
    },
  })

  if (count >= FRIEND_REQUEST_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'daily_friend_requests',
      limit: FRIEND_REQUEST_DAILY_LIMIT,
    }
  }

  return { allowed: true }
}

export async function checkShareLinkRateLimit(userId: string): Promise<RateLimitResult> {
  const since = startOfTodayUtc()

  const count = await prisma.roundShare.count({
    where: {
      sharedByUserId: userId,
      sharedToUserId: null,
      createdAt: { gte: since },
    },
  })

  if (count >= SHARE_LINK_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: 'daily_share_links',
      limit: SHARE_LINK_DAILY_LIMIT,
    }
  }

  return { allowed: true }
}
