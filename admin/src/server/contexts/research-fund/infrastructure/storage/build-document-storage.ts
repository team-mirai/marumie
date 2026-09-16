import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-document-storage";

/** 領収書原本を置く非公開バケットの既定名。ローカルは supabase/config.toml が同名で定義する */
const DEFAULT_BUCKET = "private-receipts";

/**
 * 領収書原本の非公開バケット名。
 * 本番は Vercel の RESEARCH_FUND_DOCUMENT_BUCKET で上書きする（#1346）。
 */
function documentBucket(): string {
  return process.env.RESEARCH_FUND_DOCUMENT_BUCKET?.trim() || DEFAULT_BUCKET;
}

/**
 * 書類ストレージの唯一の組み立て口。
 * アップロード・読み取りジョブ・書類表示がすべてここを通ることで、同じバケットを指す（#1449）。
 */
export function buildDocumentStorage(): SupabaseDocumentStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("領収書ストレージが未設定です");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new SupabaseDocumentStorage(client, documentBucket());
}
