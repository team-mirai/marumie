/**
 * 調研費の環境間同期用 JSON の取り込み（インポート）のドメインモデル。
 *
 * ファイルの形式そのものは書き出し側（research-fund-sync-export）と共有する。
 * ここには「取り込むときにだけ必要な概念」——実行前の確認（dry-run）で見せる件数、
 * 誤操作を防ぐ確認入力の判定——を置く。
 * ファイルの受け渡し・環境による可否判定・失敗の種類は政治団体の同期用インポートと共通
 * （shared/domain/models/sync-import-file）。
 */

import type { ResearchFundSyncPolitician } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";

/**
 * 取り込みが対応しているファイル形式のバージョン。
 * 書き出し側が上げたバージョンに追随するまでは、そのファイルを受け付けない。
 */
export const RESEARCH_FUND_SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS: readonly number[] = [1];

/** 議員室ごとの、ファイル側（取り込まれる）件数。 */
export interface ResearchFundSyncImportingCounts {
  books: number;
  payees: number;
  journalEntries: number;
  expenditureGroups: number;
  prompts: number;
  addressSearchPrompts: number;
}

/** 議員室ごとの、置き換えで消える側（この環境の既存データ）の件数。 */
export interface ResearchFundSyncDeletingCounts extends ResearchFundSyncImportingCounts {
  /** 書類（原本・公開用の版の行。ストレージ上のファイルは消さない） */
  documents: number;
  /** スキャン履歴（読み取りジョブ） */
  scanJobs: number;
}

/**
 * 議員室 1 件分の確認内容。
 * - replace: この環境に同じ slug の議員がいる。調研費データを置き換え、議員のプロフィール・所属履歴・担当は変えない
 * - create: この環境に同じ slug の議員がいない。ファイルのプロフィール（顔写真なし）で議員を作る
 */
export type ResearchFundSyncImportPlanPolitician =
  | {
      mode: "replace";
      slug: string;
      /** 取り込み先（この環境）の議員名。別の議員に入れてしまう事故を防ぐために見せる。 */
      name: string;
      importing: ResearchFundSyncImportingCounts;
      deleting: ResearchFundSyncDeletingCounts;
    }
  | {
      mode: "create";
      slug: string;
      /** ファイルの議員名。 */
      name: string;
      importing: ResearchFundSyncImportingCounts;
      /** 作られる所属履歴の件数（この環境に同じ slug の政治団体があるものだけ）。 */
      creatingMembershipCount: number;
      /** この環境に無いため所属履歴を作らない政治団体の slug。 */
      skippedOrganizationSlugs: string[];
    };

/** 実行前に画面へ出す確認内容（dry-run）。 */
export interface ResearchFundSyncImportPlan {
  exportedAt: string;
  sourceEnvironment: string;
  latestMigrationName: string | null;
  /** ファイルに入っている議員室（ファイルの順）。 */
  politicians: ResearchFundSyncImportPlanPolitician[];
}

/** 議員室 1 件分の実行結果。 */
export interface ResearchFundSyncImportResultPolitician {
  slug: string;
  mode: "replace" | "create";
  deletedJournalEntryCount: number;
  importedJournalEntryCount: number;
  createdMembershipCount: number;
}

/** 取り込みの実行結果。 */
export interface ResearchFundSyncImportResult {
  politicians: ResearchFundSyncImportResultPolitician[];
  /**
   * 置き換え自体は成功したが webapp のキャッシュ無効化に失敗した場合のメッセージ。
   * DB はすでに置き換わっているので、取り込み全体を失敗扱いにはせず警告として返す。
   */
  cacheInvalidationError: string | null;
}

/** ファイル側（取り込まれる）の件数を数える。 */
export function countImportingData(
  politician: ResearchFundSyncPolitician,
): ResearchFundSyncImportingCounts {
  return {
    books: politician.books.length,
    payees: politician.payees.length,
    journalEntries: politician.books.reduce((sum, book) => sum + book.journalEntries.length, 0),
    expenditureGroups: politician.books.reduce(
      (sum, book) => sum + book.expenditureGroups.length,
      0,
    ),
    prompts: politician.prompts.length,
    addressSearchPrompts: politician.addressSearchPrompts.length,
  };
}

/** ファイルの所属履歴の所属先（重複を除き、出現順）。 */
export function collectMembershipOrganizationSlugs(
  politician: ResearchFundSyncPolitician,
): string[] {
  return [...new Set(politician.memberships.map((membership) => membership.organizationSlug))];
}

/** 確認入力の区切り（カンマ・読点・空白）。 */
const CONFIRMATION_SEPARATOR = /[\s,、]+/;

/**
 * 確認入力が、ファイルに入っている議員 slug の全部と一致するか。
 * 置き換えは取り返しがつかないので、政治団体の同期用インポートで団体 slug を入力させるのと同じく、
 * 置き換わる議員室の slug を全て入力させる（順不同・区切りはカンマか空白）。
 */
export function matchesResearchFundSyncConfirmation(
  input: string,
  slugs: readonly string[],
): boolean {
  const entered = input
    .split(CONFIRMATION_SEPARATOR)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const expected = new Set(slugs);
  const enteredSet = new Set(entered);

  if (expected.size === 0 || enteredSet.size !== expected.size) return false;
  return [...expected].every((slug) => enteredSet.has(slug));
}
