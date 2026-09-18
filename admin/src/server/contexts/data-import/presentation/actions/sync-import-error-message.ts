import "server-only";

import {
  SyncImportForbiddenError,
  SyncImportOrganizationNotFoundError,
  SyncImportValidationError,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";

/**
 * 取り込みの失敗を画面に出すメッセージへ変換する。
 * 想定済みの失敗（環境・ファイル内容・団体不一致）はそのまま見せ、
 * それ以外は詳細を伏せてログに残す。
 */
export function toSyncImportErrorMessage(error: unknown, context: string): string {
  if (
    error instanceof SyncImportForbiddenError ||
    error instanceof SyncImportValidationError ||
    error instanceof SyncImportOrganizationNotFoundError
  ) {
    return error.message;
  }

  console.error(`${context}:`, error);
  return error instanceof Error ? error.message : "サーバー内部エラーが発生しました";
}
