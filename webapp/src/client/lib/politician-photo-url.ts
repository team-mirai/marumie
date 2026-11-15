/**
 * 議員の顔写真の URL。写真は非公開バケットにあり、この API が議員の公開設定を確かめてから配信する。
 * プレビュー URL の議員ページでは、プレビュー用の文字列を含む slug の区間をそのまま渡す。
 */
export function politicianPhotoUrl(pathSlug: string): string {
  return `/api/research-fund/politicians/${encodeURIComponent(pathSlug)}/photo`;
}
