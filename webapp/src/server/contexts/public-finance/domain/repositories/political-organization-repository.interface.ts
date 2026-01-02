import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface IPoliticalOrganizationRepository {
  findBySlug(slug: string): Promise<PoliticalOrganization | null>;
  findBySlugs(slugs: string[]): Promise<PoliticalOrganization[]>;
  findById(id: string): Promise<PoliticalOrganization | null>;
  findAll(): Promise<PoliticalOrganization[]>;
}
