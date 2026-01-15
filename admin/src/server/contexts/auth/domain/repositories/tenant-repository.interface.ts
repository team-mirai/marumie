import "server-only";

import type { Tenant } from "@/server/contexts/auth/domain/models/tenant";

/**
 * テナント作成時の入力
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  description?: string;
}

/**
 * テナントリポジトリインターフェース
 */
export interface TenantRepository {
  /**
   * IDでテナントを取得
   */
  findById(id: bigint): Promise<Tenant | null>;

  /**
   * slugでテナントを取得
   */
  findBySlug(slug: string): Promise<Tenant | null>;

  /**
   * テナントを作成
   */
  create(input: CreateTenantInput): Promise<Tenant>;

  /**
   * テナントを更新
   */
  update(id: bigint, input: Partial<CreateTenantInput>): Promise<Tenant>;
}
