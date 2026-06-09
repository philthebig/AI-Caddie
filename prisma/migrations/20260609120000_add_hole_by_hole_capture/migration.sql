-- CreateEnum
CREATE TYPE "OttMissDirection" AS ENUM ('LEFT', 'HIT', 'RIGHT');

-- CreateEnum
CREATE TYPE "AppMissDirection" AS ENUM ('LEFT', 'RIGHT', 'SHORT', 'LONG');

-- AlterTable
ALTER TABLE "Round" ADD COLUMN "holeCount" INTEGER NOT NULL DEFAULT 18;
ALTER TABLE "Round" ADD COLUMN "coursePar" INTEGER;

-- CreateTable
CREATE TABLE "Hole" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER,
    "yardage" INTEGER,
    "score" INTEGER NOT NULL,
    "putts" INTEGER NOT NULL,
    "penaltyStrokes" INTEGER NOT NULL DEFAULT 0,
    "ottMissDirection" "OttMissDirection",
    "gir" BOOLEAN NOT NULL,
    "appMissDirection" "AppMissDirection",
    "approachProximity" INTEGER,
    "upAndDownAttempt" BOOLEAN,
    "upAndDownSuccess" BOOLEAN,
    "argProximity" INTEGER,

    CONSTRAINT "Hole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hole_roundId_holeNumber_key" ON "Hole"("roundId", "holeNumber");

-- AddForeignKey
ALTER TABLE "Hole" ADD CONSTRAINT "Hole_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
