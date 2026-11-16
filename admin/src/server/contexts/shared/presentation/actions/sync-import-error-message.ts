import "server-only";

import {
  SyncImportForbiddenError,
  SyncImportStorageError,
  SyncImportTimeoutError,
  SyncImportValidationError,
} from "@/server/contexts/shared/domain/models/sync-import-file";

/**
 * 取り込みの失敗を画面に出すメッセージへ変換する。
 * 想定済みの失敗（環境・ファイル内容・確認入力の不一致・時間切れ）はそのまま見せ、
 * それ以外は詳細を伏せてログに残す。
 */
export function toSyncImportErrorMessage(error: unknown, context: string): string {
  if (
    error instanceof SyncImportForbiddenError ||
    error instanceof SyncImportValidationError ||
    error instanceof SyncImportStorageError ||
    error instanceof SyncImportTimeoutError
  ) {
    return error.message;
  }

  // 想定外のエラーは取引先名・支払先名や Prisma の制約名などの内部情報を含みうるので、
  // 応答には出さずログにだけ残す。
  console.error(`${context}:`, error);
  return "サーバー内部エラーが発生しました";
}
