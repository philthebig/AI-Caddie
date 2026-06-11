import { getDbUser } from '@/lib/auth'
import { isValidUsername, normalizeUsername, USERNAME_HINT } from '@/lib/social/username'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  const dbUser = await getDbUser()
  if (!dbUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({
    username: dbUser.username,
    name: dbUser.name,
  })
}

export async function PATCH(req: Request) {
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

  if (!isValidUsername(username)) {
    return Response.json({ error: USERNAME_HINT }, { status: 400 })
  }

  try {
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: dbUser.id } },
    })
    if (taken) {
      return Response.json({ error: 'Username already taken' }, { status: 409 })
    }

    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { username },
    })

    revalidatePath('/friends')

    return Response.json({ username: updated.username })
  } catch (err) {
    console.error('[social/profile] PATCH failed:', err)
    return Response.json(
      {
        error:
          'Could not save username. Restart the dev server (`npm run dev`) if you recently updated the app.',
      },
      { status: 500 }
    )
  }
}
