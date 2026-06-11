import { buildShareCardData } from '@/lib/social/share-card'
import { getSocialProfile } from '@/lib/social/profiles'
import { prisma } from '@/lib/db'

export type LoadedShare = {
  shareToken: string
  includeCoachHeadline: boolean
  card: ReturnType<typeof buildShareCardData>
}

export async function loadShareByToken(token: string): Promise<LoadedShare | null> {
  const share = await prisma.roundShare.findUnique({
    where: { shareToken: token },
    include: {
      round: { include: { holes: { orderBy: { holeNumber: 'asc' } } } },
      sharedBy: { select: { id: true, name: true, username: true } },
    },
  })

  if (!share) return null
  if (share.expiresAt && share.expiresAt < new Date()) return null

  const profile = await getSocialProfile(share.sharedByUserId)

  const card = buildShareCardData(share.round, share.sharedBy, {
    includeCoachHeadline: share.includeCoachHeadline,
    playerDisplayName: profile.displayName,
    playerAvatarUrl: profile.avatarUrl,
  })

  return {
    shareToken: share.shareToken,
    includeCoachHeadline: share.includeCoachHeadline,
    card,
  }
}
