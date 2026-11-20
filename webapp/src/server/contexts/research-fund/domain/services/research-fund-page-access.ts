import { verifyResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

interface ResearchFundPageAccessInput {
  slug: string;
  isPublic: boolean;
  /** URL に含まれていたプレビュー用の文字列。プレビュー URL でなければ null */
  previewToken: string | null;
  /** RESEARCH_FUND_PREVIEW_SECRET。未設定なら null */
  previewSecret: string | null;
}

/**
 * 議員ページを開かせてよいか。
 * - プレビュー用の文字列が無い URL は、調研費を「公開する」議員だけ開ける
 * - 文字列がある URL は、文字列が正しいときだけ開ける（公開中の議員でも、間違った文字列なら開かない）
 * 開かせないときは呼び出し側が、存在しない議員と区別できない 404 にする。
 */
export function canViewResearchFundPage({
  slug,
  isPublic,
  previewToken,
  previewSecret,
}: ResearchFundPageAccessInput): boolean {
  if (previewToken === null) return isPublic;
  return verifyResearchFundPreviewToken(previewSecret, slug, previewToken);
}

/**
 * 議員の顔写真を配信してよいか。議員ページを開ける議員に加えて、
 * 「準備中」として一覧（トップ・メニュー・フッター・「他の議員」）に顔写真を出している議員も配信する。
 */
export function canServePoliticianPhoto(
  input: ResearchFundPageAccessInput & {
    /** 「準備中」として一覧に出している議員か */
    isComingSoon: boolean;
  },
): boolean {
  return input.isComingSoon || canViewResearchFundPage(input);
}
