-- Feature 7: Pixels de Marketing

-- Plan flag
ALTER TABLE "Plan" ADD COLUMN "hasMarketingPixels" BOOLEAN NOT NULL DEFAULT false;

-- Pixel IDs on Tenant
ALTER TABLE "Tenant" ADD COLUMN "facebookPixelId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "googleAnalyticsId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "googleAdsId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "tiktokPixelId" TEXT;
