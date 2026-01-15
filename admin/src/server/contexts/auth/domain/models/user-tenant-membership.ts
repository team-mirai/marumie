import "server-only";

import type { TenantRole } from "@/server/contexts/auth/domain/models/tenant-role";

/**
 * ユーザーとテナントの関連（メンバーシップ）
 */
export interface UserTenantMembership {
  id: bigint;
  userId: string;
  tenantId: bigint;
  role: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テナントメンバーシップ情報（テナント詳細を含む）
 */
export interface TenantMembershipWithTenant {
  membership: UserTenantMembership;
  tenantSlug: string;
  tenantName: string;
}
