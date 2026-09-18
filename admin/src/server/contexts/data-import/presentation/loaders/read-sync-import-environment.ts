import "server-only";

import {
  isSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/data-import/domain/services/sync-import-availability";

/** 取り込みの可否判定に使う環境変数をまとめて読む。 */
export function readSyncImportEnvironment(): SyncImportEnvironment {
  return {
    dataSyncImportEnabled: process.env.DATA_SYNC_IMPORT_ENABLED,
    vercelEnv: process.env.VERCEL_ENV,
  };
}

/** 画面の出し分け用。実際の拒否はサーバー処理（usecase）側でも行う。 */
export function isSyncImportAvailable(): boolean {
  return isSyncImportAllowed(readSyncImportEnvironment());
}
