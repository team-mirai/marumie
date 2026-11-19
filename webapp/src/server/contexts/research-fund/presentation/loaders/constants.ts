/** 公開ページのキャッシュ保持時間（秒）。本番以外は短くして確認しやすくする。 */
export const CACHE_REVALIDATE_SECONDS = process.env.VERCEL_ENV === "production" ? 3600 : 10;

/**
 * 調研費の公開ページのキャッシュタグ。
 * admin の公開アクションが webapp の /api/refresh を叩き、このタグを無効化する。
 */
export const RESEARCH_FUND_CACHE_TAG = "research-fund-page-data";
