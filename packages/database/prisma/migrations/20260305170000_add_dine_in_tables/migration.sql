-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DELIVERY', 'PICKUP', 'TABLE');

-- AlterTable: Add hasTableOrder to Plan
ALTER TABLE "Plan" ADD COLUMN "hasTableOrder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add dineInEnabled to Tenant
ALTER TABLE "Tenant" ADD COLUMN "dineInEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add orderType and tableNumber to Order
ALTER TABLE "Order" ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'DELIVERY';
ALTER TABLE "Order" ADD COLUMN "tableNumber" TEXT;

-- CreateTable: DineInTable
CREATE TABLE "DineInTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DineInTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DineInTable_tenantId_number_key" ON "DineInTable"("tenantId", "number");
CREATE INDEX "DineInTable_tenantId_isActive_idx" ON "DineInTable"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "DineInTable" ADD CONSTRAINT "DineInTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
