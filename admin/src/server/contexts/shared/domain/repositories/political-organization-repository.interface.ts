import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface UpdatePoliticalOrganizationInput {
  displayName: string;
  slug: string;
  orgName?: string;
  description?: string;
}

/**
 * 政治団体（テナントID付き）
 */
export interface PoliticalOrganizationWithTenantId extends PoliticalOrganization {
  tenantId: bigint | null;
}

export interface IPoliticalOrganizationRepository {
  findAll(): Promise<PoliticalOrganization[]>;
  findById(id: bigint): Promise<PoliticalOrganization | null>;
  findBySlug(slug: string): Promise<PoliticalOrganizationWithTenantId | null>;
  findByTenantId(tenantId: bigint): Promise<PoliticalOrganization[]>;
  create(
    displayName: string,
    slug: string,
    orgName?: string,
    description?: string,
  ): Promise<PoliticalOrganization>;
  update(id: bigint, data: UpdatePoliticalOrganizationInput): Promise<PoliticalOrganization>;
  delete(id: bigint): Promise<void>;
  countTransactions(id: bigint): Promise<number>;
}
