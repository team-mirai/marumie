import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutSection from "@/client/components/common/AboutSection";
import LinkCardsSection from "@/client/components/common/LinkCardsSection";
import TransparencySection from "@/client/components/common/TransparencySection";
import MainColumn from "@/client/components/layout/MainColumn";
import ResearchFundAboutSection from "@/client/components/research-fund/ResearchFundAboutSection";
import { ResearchFundCrossLinkProvider } from "@/client/components/research-fund/ResearchFundCrossLink";
import ResearchFundExpensesSection from "@/client/components/research-fund/ResearchFundExpensesSection";
import ResearchFundFlowSection from "@/client/components/research-fund/ResearchFundFlowSection";
import ResearchFundHighlightsSection from "@/client/components/research-fund/ResearchFundHighlightsSection";
import ResearchFundMonthlySection from "@/client/components/research-fund/ResearchFundMonthlySection";
import ResearchFundPartyLinkSection from "@/client/components/research-fund/ResearchFundPartyLinkSection";
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
      ? `${data.politician.name}の調研費 - みらいまる見え政治資金`
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
      {/* 用途カードと「すべての出入金」が相互にジャンプするので、その間をまとめて包む */}
      <ResearchFundCrossLinkProvider>
        {hasHighlights && <ResearchFundHighlightsSection data={data} updatedAt={updatedAt} />}
        <TransparencySection
          title="調研費もまるごと公開。意味ある使い方か、検証できるように👀"
          intro="議員一人ひとりに支給される調研費の原資は、大切な税金。だから、使わせていただいた分はしっかり成果を示し、使途も領収書まで含めてまるごと公開しています。チームみらいがなぜここまでオープンにするのか、"
        />
        <ResearchFundMonthlySection data={data} updatedAt={updatedAt} />
        <ResearchFundExpensesSection data={data} updatedAt={updatedAt} />
      </ResearchFundCrossLinkProvider>
      <ResearchFundAboutSection data={data} />
      <ResearchFundPartyLinkSection />
      <AboutSection />
      <LinkCardsSection />
    </MainColumn>
  );
}
