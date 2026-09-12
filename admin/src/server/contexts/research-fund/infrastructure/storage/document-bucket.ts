import "server-only";

/** 領収書原本を置く非公開バケットの既定名。ローカルは supabase/config.toml が同名で定義する */
const DEFAULT_BUCKET = "private-receipts";

/**
 * 領収書原本の非公開バケット名。
 * 本番は Vercel の RESEARCH_FUND_DOCUMENT_BUCKET で上書きする（#1346）。
 */
export function researchFundDocumentBucket(): string {
  return process.env.RESEARCH_FUND_DOCUMENT_BUCKET?.trim() || DEFAULT_BUCKET;
}
