import { DonorType, TransactionType } from "@prisma/client";
import type {
  OrganizationSyncExport,
  SyncExportBalanceSnapshot,
  SyncExportCounterpart,
  SyncExportDonor,
  SyncExportReportProfile,
  SyncExportTransaction,
} from "@/server/contexts/shared/domain/models/organization-sync-export";
import {
  SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS,
  SyncImportValidationError,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";

/**
 * 環境間同期用 JSON を読み、現在のスキーマで取り込める形に検証する。
 *
 * ステージングは本番より先にマイグレーションされる運用なので、
 * ファイルが「今より古いスキーマ」で書かれていることがある。そのため:
 * - ファイルに**現在のスキーマが知らないカラム**があれば、取りこぼしに気づけないので拒否する
 * - ファイルに**無い新しいカラム**は、DB のデフォルトに相当する値で埋める
 */

const TRANSACTION_TYPES: readonly string[] = Object.values(TransactionType);
const DONOR_TYPES: readonly string[] = Object.values(DonorType);

/** `@db.Date` のカラムの表記。 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Decimal(15, 2) のカラムの表記（精度を落とさないよう文字列で持つ）。 */
const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

function fail(message: string): never {
  throw new SyncImportValidationError(message);
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${path} はオブジェクトである必要があります`);
  }
  return value as Record<string, unknown>;
}

function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} は配列である必要があります`);
  return value;
}

/** 現在のスキーマが知らないカラムを検出する（取りこぼしに気づけないので拒否する）。 */
function assertKnownKeys(
  record: Record<string, unknown>,
  knownKeys: readonly string[],
  path: string,
): void {
  const unknownKeys = Object.keys(record).filter((key) => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    fail(
      `${path} に現在のスキーマが知らないカラムがあります: ${unknownKeys.join(", ")}。` +
        `ファイルの書き出し元のほうが新しい可能性があります`,
    );
  }
}

function requiredString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (value === undefined) fail(`${path}.${key} がありません`);
  if (typeof value !== "string") fail(`${path}.${key} は文字列である必要があります`);
  return value;
}

/** ファイルに無ければ null（NULL 許容カラムの既定値）。 */
function nullableString(record: Record<string, unknown>, key: string, path: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail(`${path}.${key} は文字列または null である必要があります`);
  return value;
}

/** ファイルに無ければ fallback（NOT NULL + デフォルト有りのカラム）。 */
function stringWithDefault(
  record: Record<string, unknown>,
  key: string,
  path: string,
  fallback: string,
): string {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") fail(`${path}.${key} は文字列である必要があります`);
  return value;
}

function booleanWithDefault(
  record: Record<string, unknown>,
  key: string,
  path: string,
  fallback: boolean,
): boolean {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") fail(`${path}.${key} は真偽値である必要があります`);
  return value;
}

function requiredInteger(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (value === undefined) fail(`${path}.${key} がありません`);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${path}.${key} は整数である必要があります`);
  }
  return value;
}

function requiredEnum(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly string[],
): string {
  const value = requiredString(record, key, path);
  if (!allowed.includes(value)) {
    fail(`${path}.${key} の値 "${value}" は現在のスキーマでは扱えません`);
  }
  return value;
}

function requiredDecimal(record: Record<string, unknown>, key: string, path: string): string {
  const value = requiredString(record, key, path);
  if (!DECIMAL_PATTERN.test(value)) fail(`${path}.${key} は数値の文字列である必要があります`);
  return value;
}

function requiredDateOnly(record: Record<string, unknown>, key: string, path: string): string {
  const value = requiredString(record, key, path);
  if (!DATE_ONLY_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    fail(`${path}.${key} は YYYY-MM-DD 形式の日付である必要があります`);
  }
  return value;
}

/** ファイルに無ければ fallback（created_at / updated_at は DB 側にもデフォルトがある）。 */
function timestampWithDefault(
  record: Record<string, unknown>,
  key: string,
  path: string,
  fallback: string,
): string {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    fail(`${path}.${key} は日時の文字列である必要があります`);
  }
  return value;
}

const COUNTERPART_KEYS = ["name", "postalCode", "address"] as const;

function parseCounterpart(value: unknown, path: string): SyncExportCounterpart {
  const record = readObject(value, path);
  assertKnownKeys(record, COUNTERPART_KEYS, path);
  return {
    name: requiredString(record, "name", path),
    postalCode: nullableString(record, "postalCode", path),
    address: nullableString(record, "address", path),
  };
}

const DONOR_KEYS = ["donorType", "name", "address", "occupation"] as const;

function parseDonor(value: unknown, path: string): SyncExportDonor {
  const record = readObject(value, path);
  assertKnownKeys(record, DONOR_KEYS, path);
  return {
    donorType: requiredEnum(record, "donorType", path, DONOR_TYPES),
    name: requiredString(record, "name", path),
    address: nullableString(record, "address", path),
    occupation: nullableString(record, "occupation", path),
  };
}

const TRANSACTION_KEYS = [
  "transactionNo",
  "transactionDate",
  "financialYear",
  "transactionType",
  "debitAccount",
  "debitSubAccount",
  "debitDepartment",
  "debitPartner",
  "debitTaxCategory",
  "debitAmount",
  "creditAccount",
  "creditSubAccount",
  "creditDepartment",
  "creditPartner",
  "creditTaxCategory",
  "creditAmount",
  "description",
  "memo",
  "friendlyCategory",
  "categoryKey",
  "label",
  "hash",
  "isGrantExpenditure",
  "createdAt",
  "updatedAt",
  "counterpart",
  "donor",
] as const;

function parseTransaction(
  value: unknown,
  path: string,
  fallbackTimestamp: string,
): SyncExportTransaction {
  const record = readObject(value, path);
  assertKnownKeys(record, TRANSACTION_KEYS, path);

  return {
    transactionNo: requiredString(record, "transactionNo", path),
    transactionDate: requiredDateOnly(record, "transactionDate", path),
    financialYear: requiredInteger(record, "financialYear", path),
    transactionType: requiredEnum(record, "transactionType", path, TRANSACTION_TYPES),
    debitAccount: requiredString(record, "debitAccount", path),
    debitSubAccount: nullableString(record, "debitSubAccount", path),
    debitDepartment: nullableString(record, "debitDepartment", path),
    debitPartner: nullableString(record, "debitPartner", path),
    debitTaxCategory: nullableString(record, "debitTaxCategory", path),
    debitAmount: requiredDecimal(record, "debitAmount", path),
    creditAccount: requiredString(record, "creditAccount", path),
    creditSubAccount: nullableString(record, "creditSubAccount", path),
    creditDepartment: nullableString(record, "creditDepartment", path),
    creditPartner: nullableString(record, "creditPartner", path),
    creditTaxCategory: nullableString(record, "creditTaxCategory", path),
    creditAmount: requiredDecimal(record, "creditAmount", path),
    description: nullableString(record, "description", path),
    memo: nullableString(record, "memo", path),
    friendlyCategory: nullableString(record, "friendlyCategory", path),
    categoryKey: requiredString(record, "categoryKey", path),
    label: stringWithDefault(record, "label", path, ""),
    hash: stringWithDefault(record, "hash", path, ""),
    isGrantExpenditure: booleanWithDefault(record, "isGrantExpenditure", path, false),
    createdAt: timestampWithDefault(record, "createdAt", path, fallbackTimestamp),
    updatedAt: timestampWithDefault(record, "updatedAt", path, fallbackTimestamp),
    counterpart:
      record.counterpart === undefined || record.counterpart === null
        ? null
        : parseCounterpart(record.counterpart, `${path}.counterpart`),
    donor:
      record.donor === undefined || record.donor === null
        ? null
        : parseDonor(record.donor, `${path}.donor`),
  };
}

const BALANCE_SNAPSHOT_KEYS = ["snapshotDate", "balance", "createdAt", "updatedAt"] as const;

function parseBalanceSnapshot(
  value: unknown,
  path: string,
  fallbackTimestamp: string,
): SyncExportBalanceSnapshot {
  const record = readObject(value, path);
  assertKnownKeys(record, BALANCE_SNAPSHOT_KEYS, path);
  return {
    snapshotDate: requiredDateOnly(record, "snapshotDate", path),
    balance: requiredDecimal(record, "balance", path),
    createdAt: timestampWithDefault(record, "createdAt", path, fallbackTimestamp),
    updatedAt: timestampWithDefault(record, "updatedAt", path, fallbackTimestamp),
  };
}

const REPORT_PROFILE_KEYS = [
  "financialYear",
  "officialName",
  "officialNameKana",
  "officeAddress",
  "officeAddressBuilding",
  "details",
  "createdAt",
  "updatedAt",
] as const;

function parseReportProfile(
  value: unknown,
  path: string,
  fallbackTimestamp: string,
): SyncExportReportProfile {
  const record = readObject(value, path);
  assertKnownKeys(record, REPORT_PROFILE_KEYS, path);
  return {
    financialYear: requiredInteger(record, "financialYear", path),
    officialName: nullableString(record, "officialName", path),
    officialNameKana: nullableString(record, "officialNameKana", path),
    officeAddress: nullableString(record, "officeAddress", path),
    officeAddressBuilding: nullableString(record, "officeAddressBuilding", path),
    // details は Json 型（NOT NULL・デフォルト {}）。ファイルに無ければデフォルトで埋める。
    details: record.details === undefined || record.details === null ? {} : record.details,
    createdAt: timestampWithDefault(record, "createdAt", path, fallbackTimestamp),
    updatedAt: timestampWithDefault(record, "updatedAt", path, fallbackTimestamp),
  };
}

const COUNTS_KEYS = [
  "transactions",
  "counterparts",
  "donors",
  "balanceSnapshots",
  "organizationReportProfiles",
] as const;

function parseMeta(value: unknown): OrganizationSyncExport["meta"] {
  const path = "meta";
  const record = readObject(value, path);

  const formatVersion = requiredInteger(record, "formatVersion", path);
  if (!SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS.includes(formatVersion)) {
    fail(
      `ファイルの形式バージョン ${formatVersion} には対応していません` +
        `（対応: ${SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS.join(", ")}）`,
    );
  }

  const countsRecord = readObject(record.counts, `${path}.counts`);
  assertKnownKeys(countsRecord, COUNTS_KEYS, `${path}.counts`);

  return {
    formatVersion,
    exportedAt: requiredString(record, "exportedAt", path),
    sourceEnvironment: requiredString(record, "sourceEnvironment", path),
    latestMigrationName: nullableString(record, "latestMigrationName", path),
    organizationSlug: requiredString(record, "organizationSlug", path),
    counts: {
      transactions: requiredInteger(countsRecord, "transactions", `${path}.counts`),
      counterparts: requiredInteger(countsRecord, "counterparts", `${path}.counts`),
      donors: requiredInteger(countsRecord, "donors", `${path}.counts`),
      balanceSnapshots: requiredInteger(countsRecord, "balanceSnapshots", `${path}.counts`),
      organizationReportProfiles: requiredInteger(
        countsRecord,
        "organizationReportProfiles",
        `${path}.counts`,
      ),
    },
  };
}

/** meta の件数と実際の配列長がずれていたら、ファイルが途中で欠けている。 */
function assertCountsMatch(parsed: OrganizationSyncExport): void {
  const checks: [string, number, number][] = [
    ["transactions", parsed.meta.counts.transactions, parsed.transactions.length],
    ["balanceSnapshots", parsed.meta.counts.balanceSnapshots, parsed.balanceSnapshots.length],
    [
      "organizationReportProfiles",
      parsed.meta.counts.organizationReportProfiles,
      parsed.organizationReportProfiles.length,
    ],
  ];

  for (const [name, expected, actual] of checks) {
    if (expected !== actual) {
      fail(`${name} の件数が meta と一致しません（meta: ${expected} / 実際: ${actual}）`);
    }
  }
}

const ROOT_KEYS = [
  "meta",
  "transactions",
  "balanceSnapshots",
  "organizationReportProfiles",
] as const;

/**
 * 同期用 JSON のテキストを検証済みの構造にする。
 * 受け付けられない内容はすべて {@link SyncImportValidationError} で返す。
 */
export function parseOrganizationSyncImportFile(rawText: string): OrganizationSyncExport {
  let rootValue: unknown;
  try {
    rootValue = JSON.parse(rawText);
  } catch {
    fail("ファイルを JSON として読み取れませんでした");
  }

  const root = readObject(rootValue, "ファイル");
  assertKnownKeys(root, ROOT_KEYS, "ファイル");

  const meta = parseMeta(root.meta);
  // created_at / updated_at がファイルに無い場合は、書き出し時刻を既定値にする
  // （取り込んだ時刻より、元データの鮮度に近い）。
  const fallbackTimestamp = meta.exportedAt;

  const parsed: OrganizationSyncExport = {
    meta,
    transactions: readArray(root.transactions, "transactions").map((value, index) =>
      parseTransaction(value, `transactions[${index}]`, fallbackTimestamp),
    ),
    balanceSnapshots: readArray(root.balanceSnapshots, "balanceSnapshots").map((value, index) =>
      parseBalanceSnapshot(value, `balanceSnapshots[${index}]`, fallbackTimestamp),
    ),
    organizationReportProfiles: readArray(
      root.organizationReportProfiles,
      "organizationReportProfiles",
    ).map((value, index) =>
      parseReportProfile(value, `organizationReportProfiles[${index}]`, fallbackTimestamp),
    ),
  };

  assertCountsMatch(parsed);

  return parsed;
}
