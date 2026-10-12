-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'VIP_SALARY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "vipActivatedAt" TIMESTAMP(3),
ADD COLUMN     "vipLevel" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VipActivation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salaryDays" INTEGER NOT NULL,
    "salaryAmount" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipSalaryPayment" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "paymentDay" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipSalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VipActivation_userId_idx" ON "VipActivation"("userId");

-- CreateIndex
CREATE INDEX "VipActivation_level_idx" ON "VipActivation"("level");

-- CreateIndex
CREATE UNIQUE INDEX "VipActivation_userId_level_key" ON "VipActivation"("userId", "level");

-- CreateIndex
CREATE INDEX "VipSalaryPayment_activationId_idx" ON "VipSalaryPayment"("activationId");

-- CreateIndex
CREATE UNIQUE INDEX "VipSalaryPayment_activationId_paymentDay_key" ON "VipSalaryPayment"("activationId", "paymentDay");

-- CreateIndex
CREATE INDEX "User_vipLevel_idx" ON "User"("vipLevel");

-- AddForeignKey
ALTER TABLE "VipActivation" ADD CONSTRAINT "VipActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VipSalaryPayment" ADD CONSTRAINT "VipSalaryPayment_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "VipActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
