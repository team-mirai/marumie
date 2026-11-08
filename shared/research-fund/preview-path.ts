/**
 * 調研費を「公開しない」議員のページのプレビュー URL（/p/{slug}~{プレビュー用の文字列}/{年度}）の組み立てと読み取り。
 *
 * プレビュー用の文字列は slug と同じパスの区間に入れる。クエリ文字列にしないのは、
 * - 年度ページは ISR でキャッシュされるので、パスが違えば別のキャッシュになり、404 と表示が混ざらない
 * - ヘッダー・フッター・全件ページへのリンクは slug の区間をそのまま引き継ぐので、ページ内の移動で文字列が落ちない
 * ため。文字列の導出と照合は preview-token.ts（サーバーだけで使う）にあり、このファイルはクライアントからも使える。
 */

/** slug とプレビュー用の文字列の区切り。encodeURIComponent でエスケープされない文字にする */
const PREVIEW_SEPARATOR = "~";

/** プレビュー用の文字列の形（preview-token.ts が作る 16 進 32 文字） */
const PREVIEW_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export interface PoliticianPathSegment {
  slug: string;
  /** プレビュー URL でなければ null */
  previewToken: string | null;
}

/** URL の slug の区間を、議員の slug とプレビュー用の文字列に分ける。 */
export function parsePoliticianPathSegment(segment: string): PoliticianPathSegment {
  const separatorIndex = segment.lastIndexOf(PREVIEW_SEPARATOR);
  if (separatorIndex > 0) {
    const previewToken = segment.slice(separatorIndex + 1);
    if (PREVIEW_TOKEN_PATTERN.test(previewToken)) {
      return { slug: segment.slice(0, separatorIndex), previewToken };
    }
  }
  return { slug: segment, previewToken: null };
}

/** 議員の slug（とプレビュー用の文字列）から URL の slug の区間を作る。エンコードは呼び出し側で行う。 */
export function buildPoliticianPathSegment(slug: string, previewToken: string | null): string {
  return previewToken ? `${slug}${PREVIEW_SEPARATOR}${previewToken}` : slug;
}
