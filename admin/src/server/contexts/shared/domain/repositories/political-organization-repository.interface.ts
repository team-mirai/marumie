import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface UpdatePoliticalOrganizationInput {
  displayName: string;
  slug: string;
  orgName?: string;
  description?: string;
}

export interface IPoliticalOrganizationRepository {
  findAll(): Promise<PoliticalOrganization[]>;
  findById(id: bigint): Promise<PoliticalOrganization | null>;
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
