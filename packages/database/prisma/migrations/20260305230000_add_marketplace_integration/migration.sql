-- Feature 11: Integração iFood/Rappi

-- 1. Plan flag
ALTER TABLE "Plan" ADD COLUMN "hasMarketplace" BOOLEAN NOT NULL DEFAULT false;

-- 2. MarketplaceSource enum
CREATE TYPE "MarketplaceSource" AS ENUM ('IFOOD', 'RAPPI');

-- 3. MarketplaceStatus enum
CREATE TYPE "MarketplaceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PENDING', 'ERROR');

-- 4. MarketplaceIntegration table
CREATE TABLE "MarketplaceIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "MarketplaceSource" NOT NULL,
    "credentials" TEXT,
    "merchantId" TEXT,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "catalogSyncedAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceIntegration_pkey" PRIMARY KEY ("id")
);

-- 5. Marketplace fields on Order
ALTER TABLE "Order" ADD COLUMN "marketplaceSource" "MarketplaceSource";
ALTER TABLE "Order" ADD COLUMN "marketplaceOrderId" TEXT;

-- 6. Indexes
CREATE UNIQUE INDEX "MarketplaceIntegration_tenantId_provider_key" ON "MarketplaceIntegration"("tenantId", "provider");
CREATE INDEX "MarketplaceIntegration_provider_merchantId_idx" ON "MarketplaceIntegration"("provider", "merchantId");
CREATE INDEX "Order_marketplaceSource_marketplaceOrderId_idx" ON "Order"("marketplaceSource", "marketplaceOrderId");

-- 7. Foreign key
ALTER TABLE "MarketplaceIntegration" ADD CONSTRAINT "MarketplaceIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
