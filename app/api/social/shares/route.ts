import { getDbUser } from '@/lib/auth'
import { areFriends } from '@/lib/social/friendships'
import { checkShareLinkRateLimit } from '@/lib/social/rate-limit'
import { generateShareToken } from '@/lib/social/share-card'
import { prisma } from '@/lib/db'

const SHARE_LINK_TTL_DAYS = 30

export async function GET() {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const shares = await prisma.roundShare.findMany({
    where: { sharedToUserId: dbUser.id },
    include: {
      round: { select: { id: true, courseName: true, totalScore: true, date: true } },
      sharedBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return Response.json({
    shares: shares.map((s) => ({
      id: s.id,
      shareToken: s.shareToken,
      includeCoachHeadline: s.includeCoachHeadline,
      createdAt: s.createdAt.toISOString(),
      round: s.round,
      sharedBy: {
        id: s.sharedBy.id,
        name: s.sharedBy.name,
        username: s.sharedBy.username,
      },
    })),
  })
}

export async function POST(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    roundId?: string
    friendId?: string
    includeCoachHeadline?: boolean
    linkOnly?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { roundId, friendId, includeCoachHeadline = true, linkOnly = false } = body
  if (!roundId) {
    return Response.json({ error: 'roundId required' }, { status: 400 })
  }

  const round = await prisma.round.findUnique({ where: { id: roundId } })
  if (!round || round.userId !== dbUser.id) {
    return Response.json({ error: 'Round not found' }, { status: 404 })
  }

  if (round.status !== 'COMPLETED') {
    return Response.json({ error: 'Only completed rounds can be shared' }, { status: 400 })
  }

  if (!linkOnly && !friendId) {
    return Response.json({ error: 'friendId or linkOnly required' }, { status: 400 })
  }

  if (friendId) {
    const friends = await areFriends(dbUser.id, friendId)
    if (!friends) {
      return Response.json({ error: 'Can only share to accepted friends' }, { status: 403 })
    }
  }

  if (linkOnly) {
    const rateLimit = await checkShareLinkRateLimit(dbUser.id)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: `Share link limit reached (${rateLimit.limit}/day)` },
        { status: 429 }
      )
    }
  }

  const expiresAt = linkOnly
    ? new Date(Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    : null

  const share = await prisma.roundShare.create({
    data: {
      roundId,
      sharedByUserId: dbUser.id,
      sharedToUserId: linkOnly ? null : friendId,
      shareToken: generateShareToken(),
      includeCoachHeadline,
      expiresAt,
    },
  })

  const origin = new URL(req.url).origin
  const shareUrl = `${origin}/share/${share.shareToken}`

  return Response.json(
    {
      shareId: share.id,
      shareToken: share.shareToken,
      shareUrl,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    },
    { status: 201 }
  )
}
