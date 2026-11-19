import {
  type OrganizationSyncExport,
  SYNC_EXPORT_FORMAT_VERSION,
} from "@/server/contexts/shared/domain/models/organization-sync-export";
import type { OrganizationSyncExportSource } from "@/server/contexts/shared/domain/repositories/organization-sync-export-repository.interface";

/** 金額カラムはいずれも Decimal(15, 2)。桁を固定して書き出すことで精度を落とさない。 */
const AMOUNT_DECIMAL_PLACES = 2;

type SyncTransaction = OrganizationSyncExport["transactions"][number];

/**
 * `@db.Date` のカラムを `YYYY-MM-DD` にする。
 * Prisma は日付のみのカラムを UTC 0 時の Date として返すため、
 * ローカルタイムで読むと日付がずれる。必ず UTC で読む。
 */
function formatDateOnly(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 自然キーの組を、区切り文字の混入で衝突しない文字列にする（件数の重複排除用）。 */
function naturalKey(parts: (string | null)[]): string {
  return JSON.stringify(parts);
}

function countDistinctCounterparts(transactions: SyncTransaction[]): number {
  const keys = new Set<string>();
  for (const { counterpart } of transactions) {
    if (counterpart) keys.add(naturalKey([counterpart.name, counterpart.address]));
  }
  return keys.size;
}

function countDistinctDonors(transactions: SyncTransaction[]): number {
  const keys = new Set<string>();
  for (const { donor } of transactions) {
    if (donor) keys.add(naturalKey([donor.donorType, donor.name, donor.address]));
  }
  return keys.size;
}

interface BuildOrganizationSyncExportInput {
  source: OrganizationSyncExportSource;
  exportedAt: Date;
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  latestMigrationName: string | null;
}

/**
 * DB から読み出したデータを、環境間で復元できる JSON の構造に組み立てる。
 * DB の ID は一切含めず、取引先・寄付者は取引にネストする。
 */
export function buildOrganizationSyncExport({
  source,
  exportedAt,
  sourceEnvironment,
  latestMigrationName,
}: BuildOrganizationSyncExportInput): OrganizationSyncExport {
  const transactions: SyncTransaction[] = source.transactions.map((transaction) => ({
    transactionNo: transaction.transactionNo,
    transactionDate: formatDateOnly(transaction.transactionDate),
    financialYear: transaction.financialYear,
    transactionType: transaction.transactionType,
    debitAccount: transaction.debitAccount,
    debitSubAccount: transaction.debitSubAccount,
    debitDepartment: transaction.debitDepartment,
    debitPartner: transaction.debitPartner,
    debitTaxCategory: transaction.debitTaxCategory,
    debitAmount: transaction.debitAmount.toFixed(AMOUNT_DECIMAL_PLACES),
    creditAccount: transaction.creditAccount,
    creditSubAccount: transaction.creditSubAccount,
    creditDepartment: transaction.creditDepartment,
    creditPartner: transaction.creditPartner,
    creditTaxCategory: transaction.creditTaxCategory,
    creditAmount: transaction.creditAmount.toFixed(AMOUNT_DECIMAL_PLACES),
    description: transaction.description,
    memo: transaction.memo,
    friendlyCategory: transaction.friendlyCategory,
    categoryKey: transaction.categoryKey,
    label: transaction.label,
    hash: transaction.hash,
    isGrantExpenditure: transaction.isGrantExpenditure,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    counterpart: transaction.counterpart
      ? {
          name: transaction.counterpart.name,
          postalCode: transaction.counterpart.postalCode,
          address: transaction.counterpart.address,
        }
      : null,
    donor: transaction.donor
      ? {
          donorType: transaction.donor.donorType,
          name: transaction.donor.name,
          address: transaction.donor.address,
          occupation: transaction.donor.occupation,
        }
      : null,
  }));

  const balanceSnapshots = source.balanceSnapshots.map((snapshot) => ({
    snapshotDate: formatDateOnly(snapshot.snapshotDate),
    balance: snapshot.balance.toFixed(AMOUNT_DECIMAL_PLACES),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  }));

  const organizationReportProfiles = source.organizationReportProfiles.map((profile) => ({
    financialYear: profile.financialYear,
    officialName: profile.officialName,
    officialNameKana: profile.officialNameKana,
    officeAddress: profile.officeAddress,
    officeAddressBuilding: profile.officeAddressBuilding,
    details: profile.details,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }));

  return {
    meta: {
      formatVersion: SYNC_EXPORT_FORMAT_VERSION,
      exportedAt: exportedAt.toISOString(),
      sourceEnvironment,
      latestMigrationName,
      organizationSlug: source.organizationSlug,
      counts: {
        transactions: transactions.length,
        counterparts: countDistinctCounterparts(transactions),
        donors: countDistinctDonors(transactions),
        balanceSnapshots: balanceSnapshots.length,
        organizationReportProfiles: organizationReportProfiles.length,
      },
    },
    transactions,
    balanceSnapshots,
    organizationReportProfiles,
  };
}
