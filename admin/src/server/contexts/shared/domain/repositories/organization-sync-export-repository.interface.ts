/**
 * 環境間同期用エクスポートの入力（DB から読み出したままの形）。
 *
 * 日付は Date、金額は Decimal のまま受け取り、文字列化はドメインサービス
 * （organization-sync-export-builder）が行う。Prisma に依存しないよう、
 * Decimal は必要な最小のインターフェースだけを要求する。
 */

/** Prisma の Decimal のように、桁を落とさず固定小数の文字列へ変換できる値。 */
interface DecimalLike {
  toFixed(decimalPlaces: number): string;
}

interface SyncExportSourceCounterpart {
  name: string;
  postalCode: string | null;
  address: string | null;
}

interface SyncExportSourceDonor {
  donorType: string;
  name: string;
  address: string | null;
  occupation: string | null;
}

interface SyncExportSourceTransaction {
  transactionNo: string;
  transactionDate: Date;
  financialYear: number;
  transactionType: string;
  debitAccount: string;
  debitSubAccount: string | null;
  debitDepartment: string | null;
  debitPartner: string | null;
  debitTaxCategory: string | null;
  debitAmount: DecimalLike;
  creditAccount: string;
  creditSubAccount: string | null;
  creditDepartment: string | null;
  creditPartner: string | null;
  creditTaxCategory: string | null;
  creditAmount: DecimalLike;
  description: string | null;
  memo: string | null;
  friendlyCategory: string | null;
  categoryKey: string;
  label: string;
  hash: string;
  isGrantExpenditure: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** 1 取引につき最大 1 件（transaction_counterparts の transaction_id は unique）。 */
  counterpart: SyncExportSourceCounterpart | null;
  /** 1 取引につき最大 1 件（transaction_donors の transaction_id は unique）。 */
  donor: SyncExportSourceDonor | null;
}

interface SyncExportSourceBalanceSnapshot {
  snapshotDate: Date;
  balance: DecimalLike;
  createdAt: Date;
  updatedAt: Date;
}

interface SyncExportSourceReportProfile {
  financialYear: number;
  officialName: string | null;
  officialNameKana: string | null;
  officeAddress: string | null;
  officeAddressBuilding: string | null;
  details: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSyncExportSource {
  organizationSlug: string;
  transactions: SyncExportSourceTransaction[];
  balanceSnapshots: SyncExportSourceBalanceSnapshot[];
  organizationReportProfiles: SyncExportSourceReportProfile[];
}

export interface IOrganizationSyncExportRepository {
  /** 政治団体 1 件分の同期対象データをまとめて取得する。団体が無ければ null。 */
  findSourceByOrganizationId(
    politicalOrganizationId: string,
  ): Promise<OrganizationSyncExportSource | null>;
}
