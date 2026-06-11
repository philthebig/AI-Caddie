import { getDbUser } from '@/lib/auth'
import {
  findFriendshipBetween,
  getFriendUserId,
  listFriendshipsForUser,
  nextStatusForAction,
} from '@/lib/social/friendships'
import { normalizeUsername } from '@/lib/social/username'
import { getSocialProfiles } from '@/lib/social/profiles'
import { checkFriendRequestRateLimit } from '@/lib/social/rate-limit'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const friendships = await listFriendshipsForUser(dbUser.id)
  const profileIds = friendships.flatMap((f) => [f.requesterId, f.addresseeId])
  const profiles = await getSocialProfiles(profileIds)

  const items = friendships.map((f) => {
    const friendId = getFriendUserId(f, dbUser.id)
    const profile = profiles.get(friendId)
    const friendUser = f.requesterId === friendId ? f.requester : f.addressee
    const isIncoming = f.addresseeId === dbUser.id && f.status === 'PENDING'

    return {
      id: f.id,
      status: f.status,
      isIncoming,
      friend: {
        id: friendId,
        displayName: profile?.displayName ?? friendUser.name ?? 'Golfer',
        avatarUrl: profile?.avatarUrl ?? null,
        username: friendUser.username,
      },
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }
  })

  return Response.json({
    username: dbUser.username,
    friendships: items,
  })
}

export async function POST(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { username?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const username = body.username ? normalizeUsername(body.username) : ''
  if (!username) {
    return Response.json({ error: 'username required' }, { status: 400 })
  }

  if (!dbUser.username) {
    return Response.json(
      { error: 'Set your username on the Friends page before sending requests' },
      { status: 400 }
    )
  }

  const target = await prisma.user.findUnique({ where: { username } })
  if (!target) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.id === dbUser.id) {
    return Response.json({ error: 'Cannot add yourself' }, { status: 400 })
  }

  const existing = await findFriendshipBetween(dbUser.id, target.id)
  if (existing) {
    if (existing.status === 'ACCEPTED') {
      return Response.json({ error: 'Already friends' }, { status: 409 })
    }
    if (existing.status === 'BLOCKED') {
      return Response.json({ error: 'Unable to send request' }, { status: 403 })
    }
    if (existing.status === 'PENDING') {
      return Response.json({ error: 'Request already pending' }, { status: 409 })
    }
  }

  const rateLimit = await checkFriendRequestRateLimit(dbUser.id)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: `Friend request limit reached (${rateLimit.limit}/day)` },
      { status: 429 }
    )
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: dbUser.id,
      addresseeId: target.id,
      status: 'PENDING',
    },
  })

  revalidatePath('/friends')

  return Response.json({ friendshipId: friendship.id }, { status: 201 })
}

export async function PATCH(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { friendshipId?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { friendshipId, action } = body
  if (!friendshipId || !action) {
    return Response.json({ error: 'friendshipId and action required' }, { status: 400 })
  }

  if (!['accept', 'decline', 'block', 'cancel'].includes(action)) {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) {
    return Response.json({ error: 'Friendship not found' }, { status: 404 })
  }

  const isParticipant =
    friendship.requesterId === dbUser.id || friendship.addresseeId === dbUser.id
  if (!isParticipant) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'accept' && friendship.addresseeId !== dbUser.id) {
    return Response.json({ error: 'Only the recipient can accept' }, { status: 403 })
  }

  if (action === 'cancel' && friendship.requesterId !== dbUser.id) {
    return Response.json({ error: 'Only the sender can cancel' }, { status: 403 })
  }

  const next = nextStatusForAction(
    action as 'accept' | 'decline' | 'block' | 'cancel',
    friendship.status
  )

  if (next === 'delete') {
    await prisma.friendship.delete({ where: { id: friendshipId } })
  } else {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: next },
    })
  }

  revalidatePath('/friends')

  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const friendshipId = searchParams.get('friendshipId')
  if (!friendshipId) {
    return Response.json({ error: 'friendshipId required' }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) {
    return Response.json({ error: 'Friendship not found' }, { status: 404 })
  }

  if (friendship.status !== 'ACCEPTED') {
    return Response.json({ error: 'Can only remove accepted friends' }, { status: 400 })
  }

  const isParticipant =
    friendship.requesterId === dbUser.id || friendship.addresseeId === dbUser.id
  if (!isParticipant) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.friendship.delete({ where: { id: friendshipId } })
  revalidatePath('/friends')

  return Response.json({ ok: true })
}
