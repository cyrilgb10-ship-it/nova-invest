-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'PREMIUM_PURCHASE';
ALTER TYPE "TransactionType" ADD VALUE 'PREMIUM_REWARD';

-- CreateTable
CREATE TABLE "PremiumPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "amountInvested" INTEGER NOT NULL,
    "rewardAmount" INTEGER NOT NULL,
    "returnAmount" INTEGER NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "unlockedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "rewardClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PremiumPurchase_userId_idx" ON "PremiumPurchase"("userId");

-- CreateIndex
CREATE INDEX "PremiumPurchase_productId_idx" ON "PremiumPurchase"("productId");

-- CreateIndex
CREATE INDEX "PremiumPurchase_maturityDate_idx" ON "PremiumPurchase"("maturityDate");

-- CreateIndex
CREATE INDEX "PremiumPurchase_rewardClaimedAt_idx" ON "PremiumPurchase"("rewardClaimedAt");

-- CreateIndex
CREATE INDEX "PremiumPurchase_userId_productId_consumedAt_idx" ON "PremiumPurchase"("userId", "productId", "consumedAt");

-- AddForeignKey
ALTER TABLE "PremiumPurchase" ADD CONSTRAINT "PremiumPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPurchase" ADD CONSTRAINT "PremiumPurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InvestmentProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
