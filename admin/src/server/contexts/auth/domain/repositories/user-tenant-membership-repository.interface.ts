import "server-only";

import type { TenantRole } from "@/server/contexts/auth/domain/models/tenant-role";
import type {
  UserTenantMembership,
  TenantMembershipWithTenant,
} from "@/server/contexts/auth/domain/models/user-tenant-membership";

/**
 * メンバーシップ作成時の入力
 */
export interface CreateMembershipInput {
  userId: string;
  tenantId: bigint;
  role: TenantRole;
}

/**
 * ユーザー・テナントメンバーシップリポジトリインターフェース
 */
export interface UserTenantMembershipRepository {
  /**
   * ユーザーの所属テナント一覧を取得
   */
  findByUserId(userId: string): Promise<TenantMembershipWithTenant[]>;

  /**
   * テナントのメンバー一覧を取得
   */
  findByTenantId(tenantId: bigint): Promise<UserTenantMembership[]>;

  /**
   * 特定のユーザー・テナントの組み合わせでメンバーシップを取得
   */
  findByUserAndTenant(userId: string, tenantId: bigint): Promise<UserTenantMembership | null>;

  /**
   * メンバーシップを作成
   */
  create(input: CreateMembershipInput): Promise<UserTenantMembership>;

  /**
   * メンバーシップのロールを更新
   */
  updateRole(id: bigint, role: TenantRole): Promise<UserTenantMembership>;

  /**
   * メンバーシップを削除
   */
  delete(id: bigint): Promise<void>;
}
