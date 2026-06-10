-- CreateTable
CREATE TABLE "CourseGpsCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "externalCourseId" INTEGER,
    "courseName" TEXT,
    "payload" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGpsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseGpsCache_cacheKey_key" ON "CourseGpsCache"("cacheKey");

-- CreateIndex
CREATE INDEX "CourseGpsCache_externalCourseId_idx" ON "CourseGpsCache"("externalCourseId");
