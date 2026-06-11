import { getDbUser } from '@/lib/auth'
import { normalizeUsername } from '@/lib/social/username'
import { getSocialProfiles } from '@/lib/social/profiles'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return Response.json({ users: [] })
  }

  const query = normalizeUsername(q.replace(/^@/, ''))

  const users = await prisma.user.findMany({
    where: {
      username: { contains: query, mode: 'insensitive' },
      NOT: { id: dbUser.id },
    },
    select: { id: true, username: true, name: true },
    take: 10,
  })

  const profiles = await getSocialProfiles(users.map((u) => u.id))

  return Response.json({
    users: users.map((u) => {
      const profile = profiles.get(u.id)
      return {
        id: u.id,
        username: u.username,
        displayName: profile?.displayName ?? u.name ?? u.username ?? 'Golfer',
        avatarUrl: profile?.avatarUrl ?? null,
      }
    }),
  })
}
