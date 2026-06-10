-- CreateEnum
CREATE TYPE "CoachMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT,
    "role" "CoachMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMessage_userId_createdAt_idx" ON "CoachMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoachMessage_roundId_createdAt_idx" ON "CoachMessage"("roundId", "createdAt");

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
