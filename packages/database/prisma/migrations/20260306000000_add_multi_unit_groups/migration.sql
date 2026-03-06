-- Feature 12: Relatório Consolidado de Filiais (Multi-Unit)

-- 1. GroupMemberRole enum
CREATE TYPE "GroupMemberRole" AS ENUM ('HEADQUARTERS', 'BRANCH');

-- 2. TenantGroup table
CREATE TABLE "TenantGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerTenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantGroup_pkey" PRIMARY KEY ("id")
);

-- 3. TenantGroupMember table
CREATE TABLE "TenantGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'BRANCH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantGroupMember_pkey" PRIMARY KEY ("id")
);

-- 4. Indexes
CREATE INDEX "TenantGroup_ownerTenantId_idx" ON "TenantGroup"("ownerTenantId");
CREATE UNIQUE INDEX "TenantGroupMember_groupId_tenantId_key" ON "TenantGroupMember"("groupId", "tenantId");
CREATE INDEX "TenantGroupMember_tenantId_idx" ON "TenantGroupMember"("tenantId");

-- 5. Foreign keys
ALTER TABLE "TenantGroupMember" ADD CONSTRAINT "TenantGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TenantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantGroupMember" ADD CONSTRAINT "TenantGroupMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
