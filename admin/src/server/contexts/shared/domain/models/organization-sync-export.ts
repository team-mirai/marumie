/**
 * 環境間同期用エクスポートのファイル形式。
 *
 * 本番 / ステージングは別 DB で、ID（BIGSERIAL）は環境間で一致しない。
 * そのためファイルには DB の ID を一切含めず、自然キーだけで表現する。
 * - 政治団体: slug
 * - 取引: transaction_no（政治団体内で一意）
 * - 取引先: name + address
 * - 寄付者: name + address + donor_type
 *
 * 取引先・寄付者は 1 取引につき最大 1 件なので、取引にネストして持つ（ID 対応表が不要になる）。
 */

/** ファイル形式のバージョン。互換性の無い変更を入れるときに上げる。 */
export const SYNC_EXPORT_FORMAT_VERSION = 1;

/** 取引先（counterparts）。自然キーは name + address。 */
interface SyncExportCounterpart {
  name: string;
  postalCode: string | null;
  address: string | null;
}

/** 寄付者（donors）。自然キーは name + address + donorType。 */
interface SyncExportDonor {
  donorType: string;
  name: string;
  address: string | null;
  occupation: string | null;
}

/**
 * 取引（transactions）1 件。DB の ID（id / political_organization_id）は含めない。
 * 金額は精度を落とさない文字列、`@db.Date` の日付は `YYYY-MM-DD` の文字列。
 */
interface SyncExportTransaction {
  transactionNo: string;
  transactionDate: string;
  financialYear: number;
  transactionType: string;
  debitAccount: string;
  debitSubAccount: string | null;
  debitDepartment: string | null;
  debitPartner: string | null;
  debitTaxCategory: string | null;
  debitAmount: string;
  creditAccount: string;
  creditSubAccount: string | null;
  creditDepartment: string | null;
  creditPartner: string | null;
  creditTaxCategory: string | null;
  creditAmount: string;
  description: string | null;
  memo: string | null;
  friendlyCategory: string | null;
  categoryKey: string;
  label: string;
  hash: string;
  isGrantExpenditure: boolean;
  createdAt: string;
  updatedAt: string;
  counterpart: SyncExportCounterpart | null;
  donor: SyncExportDonor | null;
}

/** 残高（balance_snapshots）1 件。 */
interface SyncExportBalanceSnapshot {
  snapshotDate: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

/** 報告書プロフィール（organization_report_profiles）1 件。自然キーは financialYear。 */
interface SyncExportReportProfile {
  financialYear: number;
  officialName: string | null;
  officialNameKana: string | null;
  officeAddress: string | null;
  officeAddressBuilding: string | null;
  details: unknown;
  createdAt: string;
  updatedAt: string;
}

/** 各データ種別の件数。取り込み側が取りこぼしを検知するために使う。 */
interface SyncExportCounts {
  transactions: number;
  counterparts: number;
  donors: number;
  balanceSnapshots: number;
  organizationReportProfiles: number;
}

interface SyncExportMeta {
  formatVersion: number;
  exportedAt: string;
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  /**
   * 書き出し時点で適用済みの最新マイグレーション名。
   * ステージングは本番より先にマイグレーションされる運用なので、
   * 取り込み側がスキーマ差分を判定するために使う。取得できなければ null。
   */
  latestMigrationName: string | null;
  organizationSlug: string;
  counts: SyncExportCounts;
}

export interface OrganizationSyncExport {
  meta: SyncExportMeta;
  transactions: SyncExportTransaction[];
  balanceSnapshots: SyncExportBalanceSnapshot[];
  organizationReportProfiles: SyncExportReportProfile[];
}

/**
 * ダウンロード時のファイル名。
 * 同じ団体を複数回書き出しても上書きにならないよう、UTC の書き出し日時を含める。
 * slug は Content-Disposition にそのまま載るため、安全な文字だけに落とす。
 */
export function buildSyncExportFilename(organizationSlug: string, exportedAt: Date): string {
  const timestamp = exportedAt.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
  const safeSlug = organizationSlug.replace(/[^A-Za-z0-9._-]/g, "_");
  return `marumie-sync_${safeSlug}_${timestamp}.json`;
}

/** 書き出し対象の政治団体が見つからないとき。呼び出し元は 404 に変換する。 */
export class OrganizationSyncExportNotFoundError extends Error {}
