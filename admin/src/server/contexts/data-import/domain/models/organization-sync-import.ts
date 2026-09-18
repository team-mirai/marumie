/**
 * 環境間同期用 JSON の取り込み（インポート）のドメインモデル。
 *
 * ファイルの形式そのものは書き出し側（organization-sync-export）と共有する。
 * ここには「取り込むときにだけ必要な概念」——実行前の確認（dry-run）で見せる件数、
 * 自然キー、環境による可否判定、失敗の種類——を置く。
 */

import type {
  OrganizationSyncExport,
  SyncExportCounterpart,
  SyncExportDonor,
} from "@/server/contexts/shared/domain/models/organization-sync-export";

/**
 * 取り込みが対応しているファイル形式のバージョン。
 * 書き出し側が上げたバージョンに追随するまでは、そのファイルを受け付けない。
 */
export const SYNC_IMPORT_SUPPORTED_FORMAT_VERSIONS: readonly number[] = [1];

/** 取引先の自然キー。DB の一意制約 (name, address) と一致させる。 */
export interface SyncImportCounterpartKey {
  name: string;
  address: string | null;
}

/** 寄付者の自然キー。DB の一意制約 (name, address, donor_type) と一致させる。 */
export interface SyncImportDonorKey {
  donorType: string;
  name: string;
  address: string | null;
}

export function toCounterpartKey(counterpart: SyncExportCounterpart): SyncImportCounterpartKey {
  return { name: counterpart.name, address: counterpart.address };
}

export function toDonorKey(donor: SyncExportDonor): SyncImportDonorKey {
  return { donorType: donor.donorType, name: donor.name, address: donor.address };
}

/**
 * 自然キーを Map / Set の鍵にできる文字列にする。
 * 区切り文字が値に含まれていても衝突しないよう JSON 化する。
 */
export function serializeCounterpartKey(key: SyncImportCounterpartKey): string {
  return JSON.stringify([key.name, key.address]);
}

export function serializeDonorKey(key: SyncImportDonorKey): string {
  return JSON.stringify([key.donorType, key.name, key.address]);
}

/**
 * ファイルに出てくる取引先・寄付者を、出現順を保ったまま自然キーで重複排除して取り出す。
 * dry-run の「新規作成される件数」も、実際の取り込みも、この一覧を起点にする。
 */
export function collectDistinctCounterpartsAndDonors(file: OrganizationSyncExport): {
  counterparts: SyncExportCounterpart[];
  donors: SyncExportDonor[];
} {
  const counterparts = new Map<string, SyncExportCounterpart>();
  const donors = new Map<string, SyncExportDonor>();

  for (const transaction of file.transactions) {
    if (transaction.counterpart) {
      const key = serializeCounterpartKey(toCounterpartKey(transaction.counterpart));
      if (!counterparts.has(key)) counterparts.set(key, transaction.counterpart);
    }
    if (transaction.donor) {
      const key = serializeDonorKey(toDonorKey(transaction.donor));
      if (!donors.has(key)) donors.set(key, transaction.donor);
    }
  }

  return { counterparts: [...counterparts.values()], donors: [...donors.values()] };
}

/**
 * 実行前に画面へ出す確認内容（dry-run）。
 * 「何が消えて、何が入り、何が新しく作られるか」を実行前に見せるためのもの。
 */
export interface OrganizationSyncImportPlan {
  /** ファイルに書かれている団体 slug。実行時の確認入力と突き合わせる。 */
  organizationSlug: string;
  /** 取り込み先（この環境）の政治団体の表示名。別の団体に入れてしまう事故を防ぐために見せる。 */
  organizationDisplayName: string;
  exportedAt: string;
  sourceEnvironment: string;
  latestMigrationName: string | null;
  /** 置き換えのために削除される、この環境の既存取引の件数。 */
  deletingTransactionCount: number;
  /** ファイルから取り込まれる取引の件数。 */
  importingTransactionCount: number;
  deletingBalanceSnapshotCount: number;
  importingBalanceSnapshotCount: number;
  /** ファイルに出てくる取引先のうち、この環境にまだ無いもの（新規作成される）の件数。 */
  newCounterpartCount: number;
  newDonorCount: number;
  /** 団体 × 年度で上書きされる報告書プロフィールの件数。 */
  upsertingReportProfileCount: number;
}

/** 取り込みの実行結果。 */
export interface OrganizationSyncImportResult {
  organizationSlug: string;
  /**
   * 置き換え自体は成功したが webapp のキャッシュ無効化に失敗した場合のメッセージ。
   * DB はすでに置き換わっているので、取り込み全体を失敗扱いにはせず警告として返す。
   */
  cacheInvalidationError: string | null;
  deletedTransactionCount: number;
  importedTransactionCount: number;
  createdCounterpartCount: number;
  createdDonorCount: number;
  importedBalanceSnapshotCount: number;
  upsertedReportProfileCount: number;
}

/**
 * ファイルの内容が受け付けられないとき（JSON として壊れている、形式バージョンが未対応、
 * 知らないカラムがある、確認入力が一致しない など）。呼び出し元はそのまま画面に出してよい。
 */
export class SyncImportValidationError extends Error {}

/** ファイルの団体 slug に一致する政治団体がこの環境に無いとき。 */
export class SyncImportOrganizationNotFoundError extends Error {}

/** この環境では取り込みが許可されていないとき（フラグ未設定 / 本番）。 */
export class SyncImportForbiddenError extends Error {}
