import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function prismaSchemaHash() {
  try {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
    return createHash('md5').update(schema).digest('hex')
  } catch {
    return 'unknown'
  }
}

// 1. Give TypeScript the right types for our global object
const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  prismaSchemaHash?: string
}

// 2. Set up the Prisma 7 adapter just like our test script
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local and restart the dev server."
  )
}
const adapter = new PrismaPg({ connectionString })

const schemaHash = prismaSchemaHash()

/** Delegates that must exist — extend when adding new Prisma models. */
const REQUIRED_PRISMA_DELEGATES = ['coachMessage', 'friendship', 'roundShare'] as const

/** True when the cached client predates a `prisma generate` (e.g. new models missing). */
function isStalePrismaClient(client: PrismaClient | undefined): boolean {
  if (!client) return false
  return REQUIRED_PRISMA_DELEGATES.some((key) => !(key in client))
}

function shouldRecreatePrismaClient(): boolean {
  if (!globalForPrisma.prisma) return true
  if (globalForPrisma.prismaSchemaHash !== schemaHash) return true
  return isStalePrismaClient(globalForPrisma.prisma)
}

// 3. Drop cached client when schema changes or delegates are out of date
if (process.env.NODE_ENV !== 'production' && shouldRecreatePrismaClient()) {
  void globalForPrisma.prisma?.$disconnect()
  globalForPrisma.prisma = undefined
}

// 4. Create the Prisma instance ONLY if one doesn't already exist
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

// 5. Save the instance in development so it survives hot-reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSchemaHash = schemaHash
}