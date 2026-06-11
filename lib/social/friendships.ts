import { prisma } from '@/lib/db'
import type { Friendship, FriendshipStatus, User } from '@prisma/client'

export type FriendshipWithUsers = Friendship & {
  requester: Pick<User, 'id' | 'username' | 'name'>
  addressee: Pick<User, 'id' | 'username' | 'name'>
}

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  })

  return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
}

export async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  if (userId === otherUserId) return false

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
  })

  return friendship != null
}

export function getFriendUserId(friendship: Friendship, currentUserId: string): string {
  return friendship.requesterId === currentUserId ? friendship.addresseeId : friendship.requesterId
}

export async function findFriendshipBetween(
  userId: string,
  otherUserId: string
): Promise<Friendship | null> {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
  })
}

export async function listFriendshipsForUser(userId: string): Promise<FriendshipWithUsers[]> {
  return prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, username: true, name: true } },
      addressee: { select: { id: true, username: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export type FriendshipAction = 'accept' | 'decline' | 'block' | 'cancel'

export function nextStatusForAction(
  action: FriendshipAction,
  currentStatus: FriendshipStatus
): FriendshipStatus | 'delete' {
  switch (action) {
    case 'accept':
      return currentStatus === 'PENDING' ? 'ACCEPTED' : currentStatus
    case 'decline':
    case 'cancel':
      return 'delete'
    case 'block':
      return 'BLOCKED'
    default:
      return currentStatus
  }
}
