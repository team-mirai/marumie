import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutSection from "@/client/components/common/AboutSection";
import LinkCardsSection from "@/client/components/common/LinkCardsSection";
import MainColumn from "@/client/components/layout/MainColumn";
import ResearchFundAboutSection from "@/client/components/research-fund/ResearchFundAboutSection";
import ResearchFundExpensesSection from "@/client/components/research-fund/ResearchFundExpensesSection";
import ResearchFundFlowSection from "@/client/components/research-fund/ResearchFundFlowSection";
import ResearchFundHighlightsSection from "@/client/components/research-fund/ResearchFundHighlightsSection";
import ResearchFundMonthlySection from "@/client/components/research-fund/ResearchFundMonthlySection";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";

export const revalidate = 300; // 5 minutes

interface PoliticianPageProps {
  params: Promise<{ slug: string; year: string }>;
}

/** 年度が数字でない URL では DB を引かずに 404 にする。 */
function parseYear(year: string): number | null {
  return /^\d{4}$/.test(year) ? Number(year) : null;
}

export async function generateMetadata({ params }: PoliticianPageProps): Promise<Metadata> {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const data = financialYear ? await loadResearchFundPage({ slug, financialYear }) : null;

  return {
    title: data
      ? `${data.politician.name}の調査研究費 - みらいまる見え政治資金`
      : "みらいまる見え政治資金",
  };
}

export default async function PoliticianPage({ params }: PoliticianPageProps) {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const data = financialYear ? await loadResearchFundPage({ slug, financialYear }) : null;
  if (!data) notFound();

  // 「2026.8.20時点」。未設定なら公開範囲の最終日で代用する。
  const updatedAt = formatUpdatedAt(data.asOfDate ?? null);
  const hasHighlights = data.policyComment !== null || data.groups.length > 0;

  return (
    <MainColumn>
      <ResearchFundFlowSection data={data} updatedAt={updatedAt} />
      {hasHighlights && <ResearchFundHighlightsSection data={data} updatedAt={updatedAt} />}
      <ResearchFundMonthlySection data={data} updatedAt={updatedAt} />
      <ResearchFundExpensesSection data={data} updatedAt={updatedAt} />
      <ResearchFundAboutSection data={data} />
      <AboutSection />
      <LinkCardsSection />
    </MainColumn>
  );
}
