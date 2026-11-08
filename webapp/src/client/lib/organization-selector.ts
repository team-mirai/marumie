import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";

/** 調研費ページを開いているときのセレクタの表示名（「峰島侑也（調研費）」）。 */
export function formatResearchFundSelectorLabel(politicianName: string): string {
  return `${politicianName}（調研費）`;
}

/**
 * 議員ページで年度を切り替えたときの行き先。議員ページに留まれなければ null（呼び出し側が政治団体ページに戻す）。
 * - 公開する議員は、その年度に公開済みの仕訳がある（セレクタの一覧に出る）ときだけ留まる
 * - プレビュー URL（公開しない議員）は一覧に出ないので、プレビュー用の文字列を保ったまま年度だけを替える
 */
export function politicianYearHref(
  politicianPathSlug: string,
  year: number,
  publishedSlugs: readonly string[],
): string | null {
  if (!politicianPathSlug) return null;
  const isPreview = parsePoliticianPathSegment(politicianPathSlug).previewToken !== null;
  if (!isPreview && !publishedSlugs.includes(politicianPathSlug)) return null;
  return `/p/${encodeURIComponent(politicianPathSlug)}/${year}`;
}
