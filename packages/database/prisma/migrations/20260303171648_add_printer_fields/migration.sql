-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "autoPrintKitchen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoPrintOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printerIp" TEXT,
ADD COLUMN     "printerPort" INTEGER DEFAULT 9100,
ADD COLUMN     "printerType" TEXT,
ADD COLUMN     "printerWidth" INTEGER DEFAULT 48;
