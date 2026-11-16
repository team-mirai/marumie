/**
 * 調研費の環境間同期用エクスポートのファイル形式。
 *
 * 政治団体の同期用エクスポート（shared/domain/models/organization-sync-export）と同じく、
 * 本番 / ステージングで一致しない DB の ID とユーザーへの参照（作成者・更新者など）を含めず、自然キーだけで表現する。
 * - 議員: slug
 * - 政治団体（所属履歴の所属先）: slug
 * - 帳簿: 議員 + financialYear
 * - 支払先: 議員 + name + address（address は未入力を空文字で表すので NULL を含まない）
 * - 支払先の表記: 支払先 + normalizedName
 * - 仕訳: 帳簿 + hash（帳簿の中で一意）
 * - 読み取りプロンプト・住所検索プロンプト: 議員 + version
 *
 * 書類（領収書などの原本・公開用の版）は運ばない。仕訳は「書類なし」として表し、
 * 書類にぶら下がる領収書等番号・元ファイル名・ストレージ上のキーも含めない。
 * 支出群は自然キーを持たないので帳簿にネストし、対象の仕訳は hash で表す。
 */

/** ファイル形式のバージョン。互換性の無い変更を入れるときに上げる。 */
export const RESEARCH_FUND_SYNC_EXPORT_FORMAT_VERSION = 1;

/** 議員のプロフィール。顔写真（photoPath）は含めない。 */
export interface ResearchFundSyncPoliticianProfile {
  slug: string;
  name: string;
  nameKana: string | null;
  /** `YYYY-MM-DD` */
  termStart: string;
  displayOrder: number;
  isResearchFundPublic: boolean;
  house: string | null;
  constituency: string | null;
  profileUrl: string | null;
  websiteUrl: string | null;
  snsUrls: string[];
  createdAt: string;
  updatedAt: string;
}

/** 政治団体の所属履歴。所属先は政治団体の slug で表す。 */
export interface ResearchFundSyncMembership {
  organizationSlug: string;
  /** `YYYY-MM-DD` */
  startedOn: string;
  /** `YYYY-MM-DD`。NULL = 所属中 */
  endedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 支払先の表記。最初に見つかった書類への参照は運ばない。 */
interface ResearchFundSyncPayeeAlias {
  name: string;
  normalizedName: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFundSyncPayee {
  name: string;
  /** 空文字 = 未入力 */
  address: string;
  postalCode: string | null;
  invoiceRegistrationNumber: string | null;
  createdAt: string;
  updatedAt: string;
  aliases: ResearchFundSyncPayeeAlias[];
}

/** 読み取りプロンプト・住所検索プロンプトの 1 版。 */
export interface ResearchFundSyncPromptVersion {
  version: number;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 仕訳の行。金額は円・整数の文字列。 */
interface ResearchFundSyncJournalLine {
  side: string;
  accountKey: string;
  amount: string;
}

/** 仕訳ごとの法定区分の上書き。上書きした人（createdById）は運ばない。 */
interface ResearchFundSyncLegalCategoryOverride {
  legalCategoryKey: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

/** 支払先への参照（議員の中での自然キー）。 */
interface ResearchFundSyncPayeeRef {
  name: string;
  address: string;
}

/**
 * 仕訳 1 件。書類は運ばないので「書類なし」として表す（documentId を持たない）。
 * 作成者（createdById）は運ばない。
 */
interface ResearchFundSyncJournalEntry {
  hash: string;
  /** `YYYY-MM-DD` */
  entryDate: string;
  description: string;
  status: string;
  source: string;
  splitGroup: string | null;
  note: string | null;
  memo: string | null;
  advancedBy: string | null;
  /** `YYYY-MM-DD` */
  settledAt: string | null;
  payee: ResearchFundSyncPayeeRef | null;
  payeeLinkSource: string | null;
  /** 0.000〜1.000 の文字列 */
  payeeLinkConfidence: string | null;
  payeeLinkReason: string | null;
  receiptAbsent: boolean;
  receiptAbsenceReason: string | null;
  fromFundManagementOrg: boolean;
  treatAsOverTenThousand: boolean | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: ResearchFundSyncJournalLine[];
  legalCategoryOverride: ResearchFundSyncLegalCategoryOverride | null;
}

interface ResearchFundSyncGroupOutcome {
  label: string;
  url: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 支出群。対象の仕訳は同じ帳簿の仕訳の hash で表す。 */
interface ResearchFundSyncExpenditureGroup {
  title: string;
  description: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  entryHashes: string[];
  outcomes: ResearchFundSyncGroupOutcome[];
}

export interface ResearchFundSyncBook {
  financialYear: number;
  status: string;
  /** `YYYY-MM-DD` */
  publishedThrough: string | null;
  /** `YYYY-MM-DD` */
  asOfDate: string | null;
  nextUpdateNote: string | null;
  policyComment: string | null;
  details: unknown;
  allowLegalCategoryOverride: boolean;
  createdAt: string;
  updatedAt: string;
  journalEntries: ResearchFundSyncJournalEntry[];
  expenditureGroups: ResearchFundSyncExpenditureGroup[];
}

/** 議員室 1 件分のデータ。 */
export interface ResearchFundSyncPolitician {
  profile: ResearchFundSyncPoliticianProfile;
  memberships: ResearchFundSyncMembership[];
  payees: ResearchFundSyncPayee[];
  prompts: ResearchFundSyncPromptVersion[];
  addressSearchPrompts: ResearchFundSyncPromptVersion[];
  books: ResearchFundSyncBook[];
}

/** 議員室ごとの件数。取り込み側が取りこぼしを検知するために使う。 */
interface ResearchFundSyncCounts {
  memberships: number;
  books: number;
  payees: number;
  payeeAliases: number;
  journalEntries: number;
  journalLines: number;
  legalCategoryOverrides: number;
  expenditureGroups: number;
  groupItems: number;
  groupOutcomes: number;
  prompts: number;
  addressSearchPrompts: number;
}

interface ResearchFundSyncMetaPolitician {
  slug: string;
  counts: ResearchFundSyncCounts;
}

interface ResearchFundSyncMeta {
  formatVersion: number;
  exportedAt: string;
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  /** 書き出し時点で適用済みの最新マイグレーション名。取得できなければ null。 */
  latestMigrationName: string | null;
  politicians: ResearchFundSyncMetaPolitician[];
}

export interface ResearchFundSyncExport {
  meta: ResearchFundSyncMeta;
  politicians: ResearchFundSyncPolitician[];
}

/**
 * ダウンロード時のファイル名。
 * 複数回書き出しても上書きにならないよう、UTC の書き出し日時を含める。
 */
export function buildResearchFundSyncExportFilename(exportedAt: Date): string {
  const timestamp = exportedAt.toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
  return `marumie-research-fund-sync_${timestamp}.json`;
}

/** 書き出し対象の議員が見つからないとき。呼び出し元は 404 に変換する。 */
export class ResearchFundSyncExportNotFoundError extends Error {}
