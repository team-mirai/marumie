import "server-only";

import { SyncImportOrganizationNotFoundError } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import { toSyncImportErrorMessage } from "@/server/contexts/shared/presentation/actions/sync-import-error-message";

/**
 * 政治団体の取り込みの失敗を画面に出すメッセージへ変換する。
 * 団体不一致は想定済みの失敗としてそのまま見せ、それ以外は同期用インポート共通の扱いに任せる。
 */
export function toOrganizationSyncImportErrorMessage(error: unknown, context: string): string {
  if (error instanceof SyncImportOrganizationNotFoundError) return error.message;
  return toSyncImportErrorMessage(error, context);
}
