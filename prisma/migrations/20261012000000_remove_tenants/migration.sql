-- テナントの概念を削除する（#1713）。内部利用のみの方針になり、tenant_id は強制も検証もしていなかった。
-- tenants / user_tenant_memberships のデータは移行せず破棄する（不可逆）。

-- DropForeignKey
ALTER TABLE "public"."counterparts" DROP CONSTRAINT "counterparts_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."donors" DROP CONSTRAINT "donors_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."political_organizations" DROP CONSTRAINT "political_organizations_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."politicians" DROP CONSTRAINT "politicians_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_tenant_memberships" DROP CONSTRAINT "user_tenant_memberships_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_tenant_memberships" DROP CONSTRAINT "user_tenant_memberships_user_id_fkey";

-- DropIndex
DROP INDEX "public"."counterparts_tenant_id_idx";

-- DropIndex
DROP INDEX "public"."donors_tenant_id_idx";

-- DropIndex
DROP INDEX "public"."political_organizations_tenant_id_idx";

-- DropIndex
DROP INDEX "public"."politicians_tenant_id_idx";

-- AlterTable
ALTER TABLE "public"."counterparts" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "public"."donors" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "public"."political_organizations" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "public"."politicians" DROP COLUMN "tenant_id";

-- DropTable
DROP TABLE "public"."user_tenant_memberships";

-- DropTable
DROP TABLE "public"."tenants";

-- DropEnum
DROP TYPE "public"."TenantRole";
