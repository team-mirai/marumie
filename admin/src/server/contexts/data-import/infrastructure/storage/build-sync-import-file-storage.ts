import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseSyncImportFileStorage } from "@/server/contexts/data-import/infrastructure/storage/supabase-sync-import-file-storage";

/** 同期用JSONを置く非公開バケットの既定名。ローカルは supabase/config.toml が同名で定義する */
const DEFAULT_BUCKET = "sync-imports";

/**
 * 同期用JSONの非公開バケット名。
 * ステージングなどでは DATA_SYNC_IMPORT_BUCKET で上書きする（#1497）。
 */
function syncImportBucket(): string {
  return process.env.DATA_SYNC_IMPORT_BUCKET?.trim() || DEFAULT_BUCKET;
}

export function buildSyncImportFileStorage(): SupabaseSyncImportFileStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("同期用JSONのストレージが未設定です");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseSyncImportFileStorage(client, syncImportBucket());
}
