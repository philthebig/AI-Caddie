import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// 1. Load env files (Next.js uses .env.local; Prisma CLI uses both)
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // optional
  }
}

// 2. Prisma 7 Requirement: Create a Postgres adapter using your direct URL
const connectionString = process.env.DATABASE_URL
const adapter = new PrismaPg({ connectionString })

// 3. Pass the adapter to the PrismaClient constructor
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Connecting to the database...')

  // Create a new User AND a new Round at the same time
  const newGolfer = await prisma.user.create({
    data: {
      email: 'pro.golfer@example.com',
      name: 'Tiger Woods',
      rounds: {
        create: [
          {
            courseName: 'Augusta National',
            totalScore: 70,
            fairwaysHit: 11,
            greensInReg: 14,
            totalPutts: 29,
            penaltyStrokes: 0,
          },
        ],
      },
    },
    include: {
      rounds: true, 
    },
  })

  console.log('Success! Here is the data we saved to your database:')
  console.dir(newGolfer, { depth: null })
}

// Execute the function and handle any connection cleanups
main()
  .catch((error) => {
    console.error('Error inserting data:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })