import { prisma } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'

export async function getDbUser() {
  const user = await currentUser()
  if (!user?.emailAddresses[0]?.emailAddress) {
    return null
  }

  const email = user.emailAddresses[0].emailAddress

  let dbUser = await prisma.user.findUnique({ where: { email } })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || null,
        id: user.id,
      },
    })
  }

  return dbUser
}
