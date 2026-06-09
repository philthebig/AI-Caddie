-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "Round" ADD COLUMN "status" "RoundStatus" NOT NULL DEFAULT 'COMPLETED';
