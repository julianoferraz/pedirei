-- Feature 6: Recuperação de Vendas (Sales Recovery)
-- Adds plan flag, tenant settings, and recovery tracking model

-- 1. Add hasSalesRecovery to Plan
ALTER TABLE "Plan" ADD COLUMN "hasSalesRecovery" BOOLEAN NOT NULL DEFAULT false;

-- 2. Add recovery settings to Tenant
ALTER TABLE "Tenant" ADD COLUMN "recoveryEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "recoveryDelayMin" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Tenant" ADD COLUMN "recoveryMessage" TEXT NOT NULL DEFAULT 'Oi! Notamos que seu pedido foi cancelado. Que tal tentar novamente? Estamos prontos para atendê-lo! 🍕';
ALTER TABLE "Tenant" ADD COLUMN "recoveryDiscountPct" INTEGER NOT NULL DEFAULT 0;

-- 3. Add RECOVERY to CampaignType enum
ALTER TYPE "CampaignType" ADD VALUE IF NOT EXISTS 'RECOVERY';

-- 4. Create RecoveryAttempt table
CREATE TABLE "RecoveryAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "recoveredOrderId" TEXT,
    "recoveredAt" TIMESTAMP(3),

    CONSTRAINT "RecoveryAttempt_pkey" PRIMARY KEY ("id")
);

-- 5. Indexes
CREATE INDEX "RecoveryAttempt_tenantId_sentAt_idx" ON "RecoveryAttempt"("tenantId", "sentAt");
CREATE INDEX "RecoveryAttempt_orderId_idx" ON "RecoveryAttempt"("orderId");
CREATE INDEX "RecoveryAttempt_customerId_idx" ON "RecoveryAttempt"("customerId");

-- 6. Foreign keys
ALTER TABLE "RecoveryAttempt" ADD CONSTRAINT "RecoveryAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryAttempt" ADD CONSTRAINT "RecoveryAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryAttempt" ADD CONSTRAINT "RecoveryAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
