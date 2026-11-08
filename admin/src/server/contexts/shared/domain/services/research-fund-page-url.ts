import { buildPoliticianPathSegment } from "@/shared/research-fund/preview-path";
import { deriveResearchFundPreviewToken } from "@/shared/research-fund/preview-token";

/**
 * 議員の調研費ページ（webapp の /p/{slug}）の URL。
 * - public: 調研費を「公開する」議員の公開 URL
 * - preview: 「公開しない」議員のプレビュー URL（推測できない文字列を含み、知っている人だけが開ける）
 * - unavailable: 「公開しない」議員だが RESEARCH_FUND_PREVIEW_SECRET が未設定で、プレビュー URL を作れない
 */
export type ResearchFundPageUrl =
  | { kind: "public"; url: string }
  | { kind: "preview"; url: string }
  | { kind: "unavailable" };

interface ResearchFundPageUrlInput {
  /** webapp のオリジン（WEBAPP_URL） */
  webappUrl: string;
  /** RESEARCH_FUND_PREVIEW_SECRET。未設定なら null */
  previewSecret: string | null;
  slug: string;
  isResearchFundPublic: boolean;
}

/** 年度は付けない（webapp が既定の年度へ寄せる）。webapp と同じ鍵から同じ文字列を導出するので DB には保存しない。 */
export function buildResearchFundPageUrl({
  webappUrl,
  previewSecret,
  slug,
  isResearchFundPublic,
}: ResearchFundPageUrlInput): ResearchFundPageUrl {
  const origin = webappUrl.replace(/\/+$/, "");
  if (isResearchFundPublic) {
    return { kind: "public", url: `${origin}/p/${encodeURIComponent(slug)}` };
  }
  if (!previewSecret) return { kind: "unavailable" };
  const segment = buildPoliticianPathSegment(
    slug,
    deriveResearchFundPreviewToken(previewSecret, slug),
  );
  return { kind: "preview", url: `${origin}/p/${encodeURIComponent(segment)}` };
}
