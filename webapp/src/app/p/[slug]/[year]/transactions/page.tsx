import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import SectionCard from "@/client/components/layout/SectionCard";
import ResearchFundBottomBlock from "@/client/components/research-fund/ResearchFundBottomBlock";
import ResearchFundTransactionsTable from "@/client/components/research-fund/ResearchFundTransactionsTable";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { parseResearchFundTransactionsQuery } from "@/client/lib/research-fund-transactions";
import { loadResearchFundPageByPath } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-page-by-path";

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
  const page = financialYear
    ? await loadResearchFundPageByPath({ pathSlug: slug, financialYear })
    : null;
  const data = page?.data;

  return {
    title: data
      ? `${data.politician.name}の調査研究費：すべての出入金 - みらいまる見え政治資金`
      : "みらいまる見え政治資金",
    // プレビュー URL（調研費を「公開しない」議員のページはこれでしか開けない）は検索エンジンに載せない。
    ...(page?.isPreview && { robots: { index: false } }),
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
  const page = financialYear
    ? await loadResearchFundPageByPath({ pathSlug: slug, financialYear })
    : null;
  if (!page) notFound();
  const { data, pathSlug } = page;

  const query = parseResearchFundTransactionsQuery(await searchParams);

  const updatedAt = formatUpdatedAt(data.asOfDate ?? null);

  const parentLabel = `${data.politician.name}の調研費`;

  return (
    <MainColumn spacing="compact">
      <div className="flex flex-col gap-5">
        <Breadcrumbs
          parent={{
            label: parentLabel,
            href: `/p/${encodeURIComponent(pathSlug)}/${data.financialYear}`,
          }}
          current="すべての出入金"
        />
        <SectionCard
          id="transactions"
          iconSrc="/icons/icon-cashback.svg"
          iconLabel="Cash move icon"
          eyebrow={`${parentLabel}・${data.financialYear}年`}
          title="すべての出入金"
          updatedAt={updatedAt}
          headingLevel="h1"
        >
          <ResearchFundTransactionsTable
            pathSlug={pathSlug}
            financialYear={data.financialYear}
            expenses={data.expenses}
            query={query}
          />
        </SectionCard>
      </div>
      <ResearchFundBottomBlock dataNote={data.dataNote} />
    </MainColumn>
  );
}
