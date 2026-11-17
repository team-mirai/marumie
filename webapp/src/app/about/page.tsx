import "server-only";
import type { Metadata } from "next";
import AboutAimSection from "@/client/components/about/AboutAimSection";
import AboutFeaturesSection from "@/client/components/about/AboutFeaturesSection";
import AboutHeroSection from "@/client/components/about/AboutHeroSection";
import AboutOpenSourceSection from "@/client/components/about/AboutOpenSourceSection";
import AboutResearchFundSection from "@/client/components/about/AboutResearchFundSection";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import RevealOnScroll from "@/client/components/layout/RevealOnScroll";
import { buildAboutPublishedSummary } from "@/client/lib/about-published";
import { formatAsOfDate } from "@/client/lib/format-date";
import { HEADER_YEARS } from "@/client/lib/header-navigation";
import { loadHomePageData } from "@/server/contexts/public-finance/presentation/loaders/load-home-page-data";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: "まる見え政治資金とは",
};

// 「実際のチームみらいの収支を見る」で開く政党ページの年度（トップの既定の年度とそろえる）
const PARTY_PAGE_YEAR = 2026;

/**
 * 「まる見え政治資金とは」ページ（v9）。
 * 公開している収支の数 → 4つの特徴とこれまでの収支報告書との違い → 目指していること → 調研費の公開 → オープンソース の順に並べる。
 * 公開している収支の数は、ヘッダー・フッターと同じく公開中のデータから数える。
 */
export default async function AboutPage() {
  const [homeData, politicianLists] = await Promise.all([
    // DB に届かない環境（CI のビルド時など）でもページは描けるようにする
    loadHomePageData(HEADER_YEARS).catch((error) => {
      console.error("loadHomePageData error:", error);
      return null;
    }),
    Promise.all(
      HEADER_YEARS.map((financialYear) =>
        loadResearchFundPoliticians({ financialYear }).catch((error) => {
          console.error("loadResearchFundPoliticians error:", error);
          return [] as ResearchFundPoliticianEntry[];
        }),
      ),
    ),
  ]);

  const parties = homeData?.parties ?? [];
  const summary = buildAboutPublishedSummary(
    parties,
    homeData?.groups ?? [],
    Object.fromEntries(HEADER_YEARS.map((year, index) => [year, politicianLists[index]])),
  );
  const partyHref =
    parties.length > 0 ? `/o/${encodeURIComponent(parties[0].slug)}/${PARTY_PAGE_YEAR}` : null;

  return (
    <MainColumn spacing="compact">
      <div className="flex flex-col gap-5">
        <Breadcrumbs current="まる見え政治資金とは" />
        <div className="flex flex-col gap-5 min-[641px]:gap-7">
          <AboutHeroSection summary={summary} asOf={formatAsOfDate(new Date())} />
          <AboutFeaturesSection />
          <AboutAimSection partyHref={partyHref} />
          <AboutResearchFundSection />
          <AboutOpenSourceSection />
          {/* v9 のこのページは一言コメントの帯を出さず、カード3枚とデータについてだけを置く */}
          <SiteBottomBlock band={null} />
        </div>
      </div>
      <Breadcrumbs current="まる見え政治資金とは" position="bottom" />
      <RevealOnScroll />
    </MainColumn>
  );
}
