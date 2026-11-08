import "server-only";

import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import { canViewResearchFundPage } from "@/server/contexts/research-fund/domain/services/research-fund-page-access";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";
import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";
import { readResearchFundPreviewSecret } from "@/shared/research-fund/preview-token";

interface ResearchFundPageByPath {
  data: ResearchFundPageData;
  /** ページ内のリンクに使う slug の区間。プレビュー URL ならプレビュー用の文字列を含む */
  pathSlug: string;
  isPreview: boolean;
}

/**
 * URL の slug の区間（/p/{ここ}/{年度}）から議員ページのデータを引く。
 * 調研費を「公開しない」議員は、正しいプレビュー用の文字列を含む URL でなければ null（404）にする。
 * データ自体のキャッシュは loadResearchFundPage に任せ、照合は毎回ここで行う。
 */
export async function loadResearchFundPageByPath({
  pathSlug,
  financialYear,
}: {
  pathSlug: string;
  financialYear: number;
}): Promise<ResearchFundPageByPath | null> {
  const { slug, previewToken } = parsePoliticianPathSegment(pathSlug);
  const data = await loadResearchFundPage({ slug, financialYear });
  if (!data) return null;

  const canView = canViewResearchFundPage({
    slug,
    isPublic: data.isPublic,
    previewToken,
    previewSecret: readResearchFundPreviewSecret(),
  });
  if (!canView) return null;

  return { data, pathSlug, isPreview: previewToken !== null };
}
