import type { PoliticalOrganization } from "@/shared/models/political-organization";

export interface UpdatePoliticalOrganizationInput {
  displayName: string;
  slug: string;
  orgName?: string;
  description?: string;
  /** 公式サイト・SNS（#1917）。省略したときは今の値を変えない */
  websiteUrl?: string;
  snsUrls?: string[];
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
  /** 代表者の顔写真の Storage 上のキーを付け替える。null で写真なし */
  setPhotoPath(id: bigint, photoPath: string | null): Promise<void>;
  delete(id: bigint): Promise<void>;
  countTransactions(id: bigint): Promise<number>;
}
