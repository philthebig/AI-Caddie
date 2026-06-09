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

// 3. Drop cached client when schema changes (e.g. after `prisma migrate`)
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prismaSchemaHash !== schemaHash) {
  void globalForPrisma.prisma?.$disconnect()
  globalForPrisma.prisma = undefined
  globalForPrisma.prismaSchemaHash = schemaHash
}

// 4. Create the Prisma instance ONLY if one doesn't already exist
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

// 5. Save the instance in development so it survives hot-reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSchemaHash = schemaHash
}