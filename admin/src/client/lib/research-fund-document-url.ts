/**
 * 調研費の書類（PDF・画像）を開く URL。API が政治家・帳簿への所属を確かめてから
 * 署名付き URL へリダイレクトする。version に "masked" を渡すと公開用の版（個人情報を黒塗りした版）を開く
 */
export function researchFundDocumentUrl(
  target: { politicianId: string; bookId: string },
  documentId: string,
  version: "original" | "masked" = "original",
): string {
  const params = new URLSearchParams({ bookId: target.bookId, politicianId: target.politicianId });
  if (version === "masked") params.set("version", "masked");
  return `/api/research-fund/documents/${encodeURIComponent(documentId)}?${params.toString()}`;
}
