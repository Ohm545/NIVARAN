-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'SENT_BACK', 'RESUBMITTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NeedStatus" ADD VALUE 'SENT_BACK';
ALTER TYPE "NeedStatus" ADD VALUE 'APPROVED';
ALTER TYPE "NeedStatus" ADD VALUE 'REJECTED';

-- CreateTable
CREATE TABLE "government_need_reviews" (
    "id" TEXT NOT NULL,
    "governmentNeedId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "comment" TEXT,
    "fromStatus" "NeedStatus" NOT NULL,
    "toStatus" "NeedStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_need_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "government_need_reviews_governmentNeedId_idx" ON "government_need_reviews"("governmentNeedId");

-- CreateIndex
CREATE INDEX "government_need_reviews_actorId_idx" ON "government_need_reviews"("actorId");

-- CreateIndex
CREATE INDEX "government_need_reviews_action_idx" ON "government_need_reviews"("action");

-- AddForeignKey
ALTER TABLE "government_need_reviews" ADD CONSTRAINT "government_need_reviews_governmentNeedId_fkey" FOREIGN KEY ("governmentNeedId") REFERENCES "government_needs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_need_reviews" ADD CONSTRAINT "government_need_reviews_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
