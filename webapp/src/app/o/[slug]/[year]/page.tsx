import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutSection from "@/client/components/common/AboutSection";
import LinkCardsSection from "@/client/components/common/LinkCardsSection";
import AnotherPageLinkSection from "@/client/components/common/AnotherPageLinkSection";
import ExplanationSection from "@/client/components/common/ExplanationSection";
import TransparencySection from "@/client/components/common/TransparencySection";
import MainColumn from "@/client/components/layout/MainColumn";
import BalanceSheetSection from "@/client/components/top-page/BalanceSheetSection";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import MonthlyTrendsSection from "@/client/components/top-page/MonthlyTrendsSection";
import ResearchFundPartySection from "@/client/components/research-fund/ResearchFundPartySection";
import ProgressSection from "@/client/components/top-page/ProgressSection";
import TransactionsSection from "@/client/components/top-page/TransactionsSection";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadResearchFundPartySummary } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-party-summary";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { getBalanceSheetHeading } from "@/client/lib/balance-sheet-heading";

export const revalidate = 300; // 5 minutes

const VALID_YEARS = [2025, 2026] as const;

interface OrgPageProps {
  params: Promise<{
    slug: string;
    year: string;
  }>;
}

export async function generateMetadata({ params }: OrgPageProps): Promise<Metadata> {
  const { slug, year: yearParam } = await params;

  if (
    !/^\d{4}$/.test(yearParam) ||
    !VALID_YEARS.includes(parseInt(yearParam, 10) as (typeof VALID_YEARS)[number])
  ) {
    return {
      title: "みらいまる見え政治資金",
    };
  }

  const { organizations } = await loadOrganizations();
  const currentOrganization = organizations.find((org) => org.slug === slug);

  if (!currentOrganization) {
    return {
      title: "みらいまる見え政治資金",
    };
  }

  return {
    title: `${currentOrganization.displayName} - みらいまる見え政治資金`,
  };
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { slug, year: yearParam } = await params;

  // 年度の妥当性をチェック
  if (!/^\d{4}$/.test(yearParam)) {
    notFound();
  }

  const yearNumber = parseInt(yearParam, 10);
  if (!VALID_YEARS.includes(yearNumber as (typeof VALID_YEARS)[number])) {
    notFound();
  }

  const financialYear = yearNumber as (typeof VALID_YEARS)[number];

  // slugの妥当性をチェック
  const { organizations } = await loadOrganizations();
  if (!organizations.some((org) => org.slug === slug)) {
    notFound();
  }

  const slugs = [slug];

  // 現在のslugに対応する組織を取得
  const currentOrganization = organizations.find((org) => org.slug === slug);

  // 統合アクションで全データを取得
  const data = await loadTopPageData({
    slugs,
    page: 1,
    perPage: 6, // 表示用に6件のみ取得
    financialYear,
  }).catch((error) => {
    console.error("loadTopPageData error:", error);
    return null;
  });

  // A-6 調査研究費。調研費を「公開する」所属議員がいない政治団体では null になり、セクションごと出さない。
  const researchFund = await loadResearchFundPartySummary({ slug, financialYear }).catch(
    (error) => {
      console.error("loadResearchFundPartySummary error:", error);
      return null;
    },
  );

  const updatedAt = formatUpdatedAt(data?.transactionData?.lastUpdatedAt ?? null);
  const balanceSheetHeading = getBalanceSheetHeading(financialYear, updatedAt);

  return (
    <MainColumn>
      <CashFlowSection
        political={data?.political ?? null}
        friendly={data?.friendly ?? null}
        updatedAt={updatedAt}
        organizationName={currentOrganization?.displayName}
      />
      <MonthlyTrendsSection
        monthlyData={data?.monthlyData}
        updatedAt={updatedAt}
        organizationName={currentOrganization?.displayName}
      />
      <TransparencySection title="党首もこれを見て、お金をやりくりしています👀" />
      <BalanceSheetSection
        data={data?.balanceSheetData}
        title={balanceSheetHeading.title}
        updatedAt={balanceSheetHeading.updatedAt}
        organizationName={currentOrganization?.displayName}
      />
      <TransactionsSection
        transactionData={data?.transactionData ?? null}
        updatedAt={updatedAt}
        slug={slug}
        year={financialYear}
        organizationName={currentOrganization?.displayName}
      />
      {researchFund && (
        <ResearchFundPartySection
          data={researchFund}
          updatedAt={formatUpdatedAt(researchFund.asOfDate)}
        />
      )}
      <AnotherPageLinkSection currentSlug={slug} year={financialYear} />
      <ProgressSection />
      <ExplanationSection />
      <AboutSection />
      <LinkCardsSection />
    </MainColumn>
  );
}
