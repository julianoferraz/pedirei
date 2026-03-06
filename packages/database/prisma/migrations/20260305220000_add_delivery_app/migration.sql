-- Feature 10: App Entregador (PWA)

-- Plan flag
ALTER TABLE "Plan" ADD COLUMN "hasDeliveryApp" BOOLEAN NOT NULL DEFAULT false;

-- Add DRIVER to AdminRole enum
ALTER TYPE "AdminRole" ADD VALUE 'DRIVER';

-- Driver location tracking on Operator
ALTER TABLE "Operator" ADD COLUMN "driverLat" DECIMAL(10, 8);
ALTER TABLE "Operator" ADD COLUMN "driverLng" DECIMAL(11, 8);
ALTER TABLE "Operator" ADD COLUMN "driverLocationAt" TIMESTAMP(3);

-- Driver assignment on Order
ALTER TABLE "Order" ADD COLUMN "driverId" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");
