-- Feature 9: Envio em Massa WhatsApp

-- Plan flag
ALTER TABLE "Plan" ADD COLUMN "hasBulkWhatsapp" BOOLEAN NOT NULL DEFAULT false;

-- Enhance Campaign model
ALTER TABLE "Campaign" ADD COLUMN "audienceFilter" JSONB;
ALTER TABLE "Campaign" ADD COLUMN "targetCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0;

-- Index for scheduled campaign polling
CREATE INDEX "Campaign_status_scheduledAt_idx" ON "Campaign"("status", "scheduledAt");

-- Campaign message tracking
CREATE TYPE "CampaignMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "CampaignMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "CampaignMessageStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignMessage_campaignId_idx" ON "CampaignMessage"("campaignId");

ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
