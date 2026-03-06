-- CreateEnum StockMode
CREATE TYPE "StockMode" AS ENUM ('NONE', 'AVAILABLE', 'BY_QUANTITY');

-- CreateEnum SessionStatus
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable MenuItem: add stockMode + stockQty
ALTER TABLE "MenuItem" ADD COLUMN "stockMode" "StockMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "MenuItem" ADD COLUMN "stockQty" INTEGER;

-- AlterTable Plan: add hasTableManagement
ALTER TABLE "Plan" ADD COLUMN "hasTableManagement" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable RestaurantTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "posX" INTEGER NOT NULL DEFAULT 0,
    "posY" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable TableSession
CREATE TABLE "TableSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableId" TEXT,
    "guestName" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable SessionItem
CREATE TABLE "SessionItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "customName" TEXT,
    "customPrice" DECIMAL(10,2),
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "removedAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_tenantId_number_key" ON "RestaurantTable"("tenantId", "number");
CREATE INDEX "RestaurantTable_tenantId_idx" ON "RestaurantTable"("tenantId");
CREATE INDEX "TableSession_tenantId_status_idx" ON "TableSession"("tenantId", "status");
CREATE INDEX "TableSession_tenantId_tableId_idx" ON "TableSession"("tenantId", "tableId");
CREATE INDEX "SessionItem_sessionId_idx" ON "SessionItem"("sessionId");

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableSession" ADD CONSTRAINT "TableSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SessionItem" ADD CONSTRAINT "SessionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionItem" ADD CONSTRAINT "SessionItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
