import { SyncImportForbiddenError } from "@/server/contexts/data-import/domain/models/organization-sync-import";

/**
 * 取り込みの可否を決める環境の値。
 * 画面ではなくサーバー処理の本体でこれを判定し、画面はその結果を表示に使うだけにする。
 */
export interface SyncImportEnvironment {
  /** `DATA_SYNC_IMPORT_ENABLED`。文字列 "true" のときだけ有効（デフォルト拒否）。 */
  dataSyncImportEnabled: string | undefined;
  /** `VERCEL_ENV`。本番デプロイのときだけ "production" になる。 */
  vercelEnv: string | undefined;
}

/**
 * 取り込みを許可してよい環境かを判定する。
 *
 * 逆方向（本番へのインポート）は取り返しがつかないため、二重に止める:
 * - `DATA_SYNC_IMPORT_ENABLED` が "true" でなければ拒否（設定し忘れた環境では動かない）
 * - `VERCEL_ENV` が "production" ならフラグの値によらず拒否
 *
 * Vercel のカスタム環境（staging）では `VERCEL_ENV` は "preview" になるので、
 * "production" は本番デプロイだけを指す。
 */
export function isSyncImportAllowed({
  dataSyncImportEnabled,
  vercelEnv,
}: SyncImportEnvironment): boolean {
  if (vercelEnv === "production") return false;
  return dataSyncImportEnabled === "true";
}

/** 許可されていない環境なら {@link SyncImportForbiddenError} を投げる。 */
export function assertSyncImportAllowed(environment: SyncImportEnvironment): void {
  if (isSyncImportAllowed(environment)) return;

  throw new SyncImportForbiddenError(
    "この環境では同期用データの取り込みは利用できません（DATA_SYNC_IMPORT_ENABLED が true の非本番環境でのみ利用できます）",
  );
}
