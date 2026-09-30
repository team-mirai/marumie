import "server-only";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import AboutSection from "@/client/components/common/AboutSection";
import LinkCardsSection from "@/client/components/common/LinkCardsSection";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumn from "@/client/components/layout/MainColumn";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundAboutSection from "@/client/components/research-fund/ResearchFundAboutSection";
import ResearchFundTransactionsTable from "@/client/components/research-fund/ResearchFundTransactionsTable";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { parseResearchFundTransactionsQuery } from "@/client/lib/research-fund-transactions";
import { loadResearchFundPage } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page";

export const revalidate = 300; // 5 minutes

interface PoliticianTransactionsPageProps {
  params: Promise<{ slug: string; year: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** 年度が数字でない URL では DB を引かずに 404 にする。 */
function parseYear(year: string): number | null {
  return /^\d{4}$/.test(year) ? Number(year) : null;
}

export async function generateMetadata({
  params,
}: PoliticianTransactionsPageProps): Promise<Metadata> {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const data = financialYear ? await loadResearchFundPage({ slug, financialYear }) : null;

  return {
    title: data
      ? `${data.politician.name}の調査研究費：すべての出入金 - みらいまる見え政治資金`
      : "みらいまる見え政治資金",
  };
}

/**
 * 調研費の「すべての出入金」全件ページ。議員ページと同じ loader の published の支給と支出だけを出す。
 * 絞り込み・並び順・ページは URL（政治団体の全件ページと同じ `categories` / `sort` / `order` / `page`）で指定できる。
 */
export default async function PoliticianTransactionsPage({
  params,
  searchParams,
}: PoliticianTransactionsPageProps) {
  const { slug, year } = await params;
  const financialYear = parseYear(year);
  const data = financialYear ? await loadResearchFundPage({ slug, financialYear }) : null;
  if (!data) notFound();

  const query = parseResearchFundTransactionsQuery(await searchParams);

  const updatedAt = formatUpdatedAt(data.asOfDate ?? null);

  return (
    <MainColumn>
      <MainColumnCard id="transactions">
        <CardHeader
          icon={
            <Image src="/icons/icon-cashback.svg" alt="Cash move icon" width={30} height={30} />
          }
          organizationName={`${data.politician.name}・調研費`}
          title="すべての出入金"
          updatedAt={updatedAt}
          subtitle="これまでにデータ連携された出入金の明細"
        />
        <ResearchFundTransactionsTable
          slug={data.politician.slug}
          financialYear={data.financialYear}
          expenses={data.expenses}
          query={query}
        />
      </MainColumnCard>
      <ResearchFundAboutSection data={data} />
      <AboutSection />
      <LinkCardsSection />
    </MainColumn>
  );
}
