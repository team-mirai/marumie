import "server-only";

/**
 * サイト内の導線（ヘッダーの組織セレクター・ナビ、政治団体ページの調査研究費セクション、sitemap）に
 * 調研費を出さないか。`HIDE_RESEARCH_FUND_ENTRY=true` のときだけ隠し、未設定なら出す。
 * 議員ページ（/p/...）自体は隠さないので、URL を知っていれば開ける。
 */
export function isResearchFundEntryHidden(): boolean {
  return process.env.HIDE_RESEARCH_FUND_ENTRY === "true";
}
