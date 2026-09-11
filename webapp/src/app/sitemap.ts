import type { MetadataRoute } from "next";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadPublishedResearchFundPages } from "@/server/contexts/research-fund/presentation/loaders/load-published-research-fund-pages";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.WEBAPP_URL || "https://marumie.team-mir.ai";

  // 組織データと調研費の公開ページを取得（0件の場合は空配列が返される）
  const [{ organizations }, researchFundPages] = await Promise.all([
    loadOrganizations(),
    loadPublishedResearchFundPages(),
  ]);

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // 各組織のページを追加
  organizations.forEach((org) => {
    // 組織のメインページ
    sitemap.push({
      url: `${baseUrl}/o/${org.slug}`,
      changeFrequency: "weekly",
      priority: 0.9,
    });

    // 組織のtransactionsページ
    sitemap.push({
      url: `${baseUrl}/o/${org.slug}/transactions`,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  // 調査研究費の議員ページ（/p/[slug]/[year]）
  researchFundPages.forEach(({ slug, financialYear }) => {
    sitemap.push({
      url: `${baseUrl}/p/${encodeURIComponent(slug)}/${financialYear}`,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  });

  return sitemap;
}
