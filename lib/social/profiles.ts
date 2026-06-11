import { clerkClient } from '@clerk/nextjs/server'

export type SocialProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
  username: string | null
}

export async function getSocialProfiles(userIds: string[]): Promise<Map<string, SocialProfile>> {
  const unique = [...new Set(userIds)]
  const map = new Map<string, SocialProfile>()
  if (unique.length === 0) return map

  const clerk = await clerkClient()

  await Promise.all(
    unique.map(async (id) => {
      try {
        const user = await clerk.users.getUser(id)
        const displayName =
          [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
          user.username ||
          'Golfer'
        map.set(id, {
          id,
          displayName,
          avatarUrl: user.imageUrl ?? null,
          username: user.username ?? null,
        })
      } catch {
        map.set(id, {
          id,
          displayName: 'Golfer',
          avatarUrl: null,
          username: null,
        })
      }
    })
  )

  return map
}

export async function getSocialProfile(userId: string): Promise<SocialProfile> {
  const map = await getSocialProfiles([userId])
  return map.get(userId) ?? { id: userId, displayName: 'Golfer', avatarUrl: null, username: null }
}
