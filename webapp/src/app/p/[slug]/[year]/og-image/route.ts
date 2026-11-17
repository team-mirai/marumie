import "server-only";
import { loadResearchFundOgImageData } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-og-image-data";
import {
  ogPhotoDataUri,
  renderFinanceOgImage,
  topOgImageResponse,
} from "@/app/_og-image/render-finance-og-image";

/**
 * 議員の調研費ページ（/p/{slug}/{year}）のシェア用画像（1200×630 の PNG）。
 * その議員・その年の調研費の図を描く。ページが開けない・データが無い・描けないときは、エラーではなくトップの画像を返す。
 * ページと同じ条件で引くので、公開していない議員の画像はプレビュー URL（slug の区間にプレビュー用の文字列を含む）でしか作られない。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; year: string }> },
) {
  const { slug, year } = await params;
  if (!/^\d{4}$/.test(year)) return await topOgImageResponse();
  const financialYear = Number(year);

  try {
    const data = await loadResearchFundOgImageData(slug, financialYear);
    if (!data) return await topOgImageResponse();
    const photo = data.photo ? await ogPhotoDataUri(data.photo) : null;
    const image = await renderFinanceOgImage({
      key: `p/${data.slug}/${financialYear}`,
      variant: "member",
      face: photo ? { kind: "photo", src: photo } : { kind: "person" },
      title: `${data.name}の調研費`,
      sankey: data.sankey,
      totals: data.totals,
    });
    return image ?? (await topOgImageResponse());
  } catch (error) {
    console.error("og-image error:", error);
    return await topOgImageResponse();
  }
}
