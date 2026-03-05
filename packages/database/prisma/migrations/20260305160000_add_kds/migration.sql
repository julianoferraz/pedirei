-- CreateEnum
CREATE TYPE "KdsItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY');

-- AlterTable: Add hasKds to Plan
ALTER TABLE "Plan" ADD COLUMN "hasKds" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add kdsStatus to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "kdsStatus" "KdsItemStatus" NOT NULL DEFAULT 'PENDING';
