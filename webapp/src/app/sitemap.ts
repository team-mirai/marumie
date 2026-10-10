import type { MetadataRoute } from "next";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadPublishedResearchFundPages } from "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages";

export const dynamic = "force-static";

// 公開内容の変化を再デプロイなしで反映するため、1 時間ごとに作り直す。
// これが無いと、デプロイ時か /api/refresh でタグが無効化されたときにしか作り直されない。
// （segment config は静的に解析されるので、定数を import せずリテラルで書く）
export const revalidate = 3600;

// 政治団体ページの年度切り替えで選べる年度（/o/[slug]/[year] の VALID_YEARS と揃える）
const ORGANIZATION_YEARS = [2025, 2026] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.WEBAPP_URL || "https://marumie.team-mir.ai";

  // 組織データと調研費の公開ページを取得（0件の場合は空配列が返される）
  // 調研費を「公開しない」議員のページは loader が返さないので sitemap に載らない。
  const [{ organizations }, researchFundPages] = await Promise.all([
    loadOrganizations(),
    loadPublishedResearchFundPages(),
  ]);

  // リダイレクトなしで表示されるページだけを載せる。
  // `/`・`/o/[slug]`・`/o/[slug]/transactions` は年度つきの URL へ飛ばすだけなので載せない。
  const sitemap: MetadataRoute.Sitemap = [];

  // 各組織の年度ごとのページを追加
  organizations.forEach((org) => {
    ORGANIZATION_YEARS.forEach((year) => {
      // 組織のメインページ
      sitemap.push({
        url: `${baseUrl}/o/${org.slug}/${year}`,
        changeFrequency: "weekly",
        priority: 0.9,
      });

      // 組織のtransactionsページ
      sitemap.push({
        url: `${baseUrl}/o/${org.slug}/${year}/transactions`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    });
  });

  // 調査研究費の議員ページ（/p/[slug]/[year]）と全件ページ（/p/[slug]/[year]/transactions）
  researchFundPages.forEach(({ slug, financialYear }) => {
    const pagePath = `${baseUrl}/p/${encodeURIComponent(slug)}/${financialYear}`;
    sitemap.push({
      url: pagePath,
      changeFrequency: "weekly",
      priority: 0.9,
    });
    sitemap.push({
      url: `${pagePath}/transactions`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  return sitemap;
}
