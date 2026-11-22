import type {
  NormalizedPoliticalOrganizationInput,
  PoliticalOrganization,
} from "@/shared/models/political-organization";

export interface IPoliticalOrganizationRepository {
  findAll(): Promise<PoliticalOrganization[]>;
  findById(id: bigint): Promise<PoliticalOrganization | null>;
  create(data: NormalizedPoliticalOrganizationInput): Promise<PoliticalOrganization>;
  /** 公式サイト・SNS（#1917）は省略したときは今の値を変えない */
  update(id: bigint, data: NormalizedPoliticalOrganizationInput): Promise<PoliticalOrganization>;
  /** 代表者の顔写真の Storage 上のキーを付け替える。null で写真なし */
  setPhotoPath(id: bigint, photoPath: string | null): Promise<void>;
  delete(id: bigint): Promise<void>;
  countTransactions(id: bigint): Promise<number>;
}
