import "server-only";
import { PARTY_SLUGS, isValidYear } from "@/app/o/[slug]/[year]/organization-page-config";
import { loadOrganizationOgImageData } from "@/server/contexts/public-finance/presentation/loaders/load-organization-og-image-data";
import {
  ogPhotoDataUri,
  renderFinanceOgImage,
  topOgImageResponse,
} from "@/app/_og-image/render-finance-og-image";

/**
 * 政党・政治団体ページ（/o/{slug}/{year}）のシェア用画像（1200×630 の PNG）。
 * その団体・その年の収支の図を描く。団体が無い・データが取れない・描けないときは、エラーではなくトップの画像を返す。
 * データはページと同じキャッシュから取るので、admin の公開でキャッシュが作り直されると画像も新しい数字になる。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; year: string }> },
) {
  const { slug, year } = await params;
  const financialYear = Number(year);
  if (!isValidYear(financialYear)) return await topOgImageResponse();

  try {
    const isParty = PARTY_SLUGS.includes(slug);
    const data = await loadOrganizationOgImageData(slug, financialYear, { withPhoto: !isParty });
    if (!data) return await topOgImageResponse();
    const photo = data.photo ? ogPhotoDataUri(data.photo) : null;
    const image = await renderFinanceOgImage({
      key: `o/${slug}/${financialYear}`,
      variant: isParty ? "party" : "group",
      face: isParty ? { kind: "logo" } : photo ? { kind: "photo", src: photo } : { kind: "person" },
      title: isParty ? `${data.displayName}の収支` : data.displayName,
      sankey: data.friendly,
    });
    return image ?? (await topOgImageResponse());
  } catch (error) {
    console.error("og-image error:", error);
    return await topOgImageResponse();
  }
}
