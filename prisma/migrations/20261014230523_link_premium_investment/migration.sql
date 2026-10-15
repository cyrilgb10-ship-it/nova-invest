/*
  Warnings:

  - A unique constraint covering the columns `[premiumPurchaseId]` on the table `Investment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "premiumPurchaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Investment_premiumPurchaseId_key" ON "Investment"("premiumPurchaseId");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_premiumPurchaseId_fkey" FOREIGN KEY ("premiumPurchaseId") REFERENCES "PremiumPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
