import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface IPoliticalOrganizationRepository {
  findBySlug(slug: string): Promise<PoliticalOrganization | null>;
  findBySlugs(slugs: string[]): Promise<PoliticalOrganization[]>;
  findById(id: string): Promise<PoliticalOrganization | null>;
  findAll(): Promise<PoliticalOrganization[]>;
  /** 収支報告書の設定に入力された政治団体区分（年ごと）を、政治団体の ID ごとにまとめて返す。未入力の年は含めない */
  findTypeCodesByIds(ids: string[]): Promise<Map<string, string[]>>;
}
