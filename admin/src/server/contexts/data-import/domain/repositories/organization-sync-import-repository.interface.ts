import type { OrganizationSyncExport } from "@/server/contexts/shared/domain/models/organization-sync-export";
import type {
  SyncImportCounterpartKey,
  SyncImportDonorKey,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";

/** 取り込み先（この環境）の政治団体。ファイルの slug で引く。 */
export interface SyncImportTargetOrganization {
  id: string;
  displayName: string;
}

export interface ReplaceOrganizationSyncDataInput {
  /** 取り込み先の政治団体（この環境の ID）。 */
  politicalOrganizationId: string;
  /** 検証済みのファイル内容。 */
  file: OrganizationSyncExport;
}

export interface ReplaceOrganizationSyncDataResult {
  deletedTransactionCount: number;
  importedTransactionCount: number;
  createdCounterpartCount: number;
  createdDonorCount: number;
  importedBalanceSnapshotCount: number;
  upsertedReportProfileCount: number;
}

export interface IOrganizationSyncImportRepository {
  /** ファイルの団体 slug に一致する政治団体を引く。無ければ null。 */
  findOrganizationBySlug(slug: string): Promise<SyncImportTargetOrganization | null>;

  /** 置き換えで削除される既存取引の件数（dry-run 用）。 */
  countTransactions(politicalOrganizationId: string): Promise<number>;

  /** 置き換えで削除される既存残高の件数（dry-run 用）。 */
  countBalanceSnapshots(politicalOrganizationId: string): Promise<number>;

  /**
   * 渡した自然キーのうち、この環境に既に存在するものだけを返す（dry-run 用）。
   * 取引先・寄付者の一意制約はテナントをまたぐグローバル制約なので、テナントは見ない。
   */
  findExistingCounterpartKeys(
    keys: SyncImportCounterpartKey[],
  ): Promise<SyncImportCounterpartKey[]>;

  findExistingDonorKeys(keys: SyncImportDonorKey[]): Promise<SyncImportDonorKey[]>;

  /**
   * 政治団体 1 件分のデータをファイルの内容で置き換える。
   * 全体を 1 つの DB トランザクションで行い、途中で失敗したら何も変わらないこと。
   */
  replaceOrganizationSyncData(
    input: ReplaceOrganizationSyncDataInput,
  ): Promise<ReplaceOrganizationSyncDataResult>;
}
