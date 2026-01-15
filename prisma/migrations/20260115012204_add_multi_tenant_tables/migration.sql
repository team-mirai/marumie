-- CreateEnum
CREATE TYPE "public"."TenantRole" AS ENUM ('owner', 'admin', 'editor');

-- AlterTable
ALTER TABLE "public"."counterparts" ADD COLUMN     "tenant_id" BIGINT;

-- AlterTable
ALTER TABLE "public"."donors" ADD COLUMN     "tenant_id" BIGINT;

-- AlterTable
ALTER TABLE "public"."political_organizations" ADD COLUMN     "tenant_id" BIGINT;

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_tenant_memberships" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "role" "public"."TenantRole" NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE INDEX "user_tenant_memberships_user_id_idx" ON "public"."user_tenant_memberships"("user_id");

-- CreateIndex
CREATE INDEX "user_tenant_memberships_tenant_id_idx" ON "public"."user_tenant_memberships"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenant_memberships_user_id_tenant_id_key" ON "public"."user_tenant_memberships"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "counterparts_tenant_id_idx" ON "public"."counterparts"("tenant_id");

-- CreateIndex
CREATE INDEX "donors_tenant_id_idx" ON "public"."donors"("tenant_id");

-- CreateIndex
CREATE INDEX "political_organizations_tenant_id_idx" ON "public"."political_organizations"("tenant_id");

-- AddForeignKey
ALTER TABLE "public"."user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tenant_memberships" ADD CONSTRAINT "user_tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."political_organizations" ADD CONSTRAINT "political_organizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."counterparts" ADD CONSTRAINT "counterparts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."donors" ADD CONSTRAINT "donors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
