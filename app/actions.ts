'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server' // <--- New import

const createRoundSchema = z.object({
  courseName: z.string().min(1),
  totalScore: z.coerce.number().min(50),
  fairwaysHit: z.coerce.number().min(0),
  greensInReg: z.coerce.number().min(0),
  totalPutts: z.coerce.number().min(0),
  penaltyStrokes: z.coerce.number().min(0).default(0),
})

export async function createRound(formData: FormData) {
  // 1. GET THE REAL USER
  const user = await currentUser();
  
  if (!user) {
    return { error: "You must be logged in" }
  }

  // 2. CHECK IF USER EXISTS IN DB, IF NOT, CREATE THEM
  // This "syncs" Clerk with your Postgres DB on the fly
  let dbUser = await prisma.user.findUnique({
    where: { email: user.emailAddresses[0].emailAddress }
  })

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName} ${user.lastName}`,
        id: user.id // OPTIONAL: Use Clerk ID as database ID for simplicity
      }
    })
  }

  const rawData = {
    courseName: formData.get('courseName'),
    totalScore: formData.get('totalScore'),
    fairwaysHit: formData.get('fairwaysHit'),
    greensInReg: formData.get('greensInReg'),
    totalPutts: formData.get('totalPutts'),
    penaltyStrokes: formData.get('penaltyStrokes'),
  }

  const result = createRoundSchema.safeParse(rawData)

  if (!result.success) {
    return { error: "Invalid data" }
  }

  await prisma.round.create({
    data: {
      userId: dbUser.id, // Now using the REAL user's ID
      ...result.data,
    },
  })

  revalidatePath('/')
  return { success: true }
}