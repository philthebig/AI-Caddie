import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// 1. Give TypeScript the right types for our global object
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 2. Set up the Prisma 7 adapter just like our test script
const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })

// 3. Create the Prisma instance ONLY if one doesn't already exist
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

// 4. Save the instance in development so it survives hot-reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma