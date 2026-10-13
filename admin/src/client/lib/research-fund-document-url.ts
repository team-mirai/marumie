/**
 * 調研費の書類（PDF・画像）を開く URL。API が政治家・帳簿への所属を確かめてから
 * 署名付き URL へリダイレクトする
 */
export function researchFundDocumentUrl(
  target: { politicianId: string; bookId: string },
  documentId: string,
): string {
  const params = new URLSearchParams({ bookId: target.bookId, politicianId: target.politicianId });
  return `/api/research-fund/documents/${encodeURIComponent(documentId)}?${params.toString()}`;
}
