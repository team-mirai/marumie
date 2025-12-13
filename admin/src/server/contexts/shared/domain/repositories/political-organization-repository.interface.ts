import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface IPoliticalOrganizationRepository {
  create(
    displayName: string,
    slug: string,
    orgName?: string,
    description?: string,
  ): Promise<PoliticalOrganization>;
  delete(id: bigint): Promise<void>;
  countTransactions(id: bigint): Promise<number>;
}
