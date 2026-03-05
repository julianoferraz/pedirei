-- AlterTable: Add hasLoyalty to Plan
ALTER TABLE "Plan" ADD COLUMN "hasLoyalty" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add loyalty config fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "loyaltyPointsPerReal" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Tenant" ADD COLUMN "loyaltyMinOrderValue" DECIMAL(10,2);

-- AlterTable: Add loyaltyPoints to Customer
ALTER TABLE "Customer" ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('FREE_ITEM', 'DISCOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE');

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "type" "LoyaltyRewardType" NOT NULL DEFAULT 'FREE_ITEM',
    "discountValue" DECIMAL(10,2),
    "menuItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "orderId" TEXT,
    "rewardId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyReward_tenantId_isActive_idx" ON "LoyaltyReward"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_tenantId_customerId_idx" ON "LoyaltyTransaction"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_tenantId_createdAt_idx" ON "LoyaltyTransaction"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoyaltyReward" ADD CONSTRAINT "LoyaltyReward_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
