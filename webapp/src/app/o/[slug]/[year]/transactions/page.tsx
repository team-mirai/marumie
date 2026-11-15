import "server-only";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import SectionCard from "@/client/components/layout/SectionCard";
import InteractiveTransactionTable from "@/client/components/top-page/features/transactions-table/InteractiveTransactionTable";
import { loadTransactionsPageData } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { formatUpdatedAt } from "@/client/lib/format-date";

const VALID_YEARS = [2025, 2026] as const;
const DEFAULT_YEAR = 2026;

interface TransactionsPageProps {
  params: Promise<{
    slug: string;
    year: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; year: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { default: defaultSlug, organizations } = await loadOrganizations();
  const validSlug = organizations.some((org) => org.slug === slug) ? slug : defaultSlug;

  const organization = organizations.find((org) => org.slug === validSlug);

  return {
    title: `${organization?.displayName || "Unknown"}:全ての出入金 - みらいまる見え政治資金`,
    description: `${organization?.displayName || "Unknown"}の政治資金取引一覧を表示しています。`,
  };
}

export default async function TransactionsPage({ params, searchParams }: TransactionsPageProps) {
  const { slug, year: yearParam } = await params;

  // 年度の妥当性をチェック
  const yearNumber = parseInt(yearParam, 10);
  const financialYear = VALID_YEARS.includes(yearNumber as (typeof VALID_YEARS)[number])
    ? yearNumber
    : DEFAULT_YEAR;

  // 年度が不正な場合はデフォルト年度にリダイレクト
  if (financialYear !== yearNumber) {
    redirect(`/o/${slug}/${DEFAULT_YEAR}/transactions`);
  }

  // slugの妥当性をチェックし、必要に応じてリダイレクト
  const { default: defaultSlug, organizations } = await loadOrganizations();
  if (!organizations.some((org) => org.slug === slug)) {
    redirect(`/o/${defaultSlug}/${financialYear}/transactions`);
  }

  const slugs = [slug];
  const searchParamsResolved = await searchParams;

  const page = parseInt(
    Array.isArray(searchParamsResolved.page)
      ? searchParamsResolved.page[0] || "1"
      : searchParamsResolved.page || "1",
    10,
  );
  const perPage = 50; // Fixed value

  const filterType = Array.isArray(searchParamsResolved.filterType)
    ? searchParamsResolved.filterType[0]
    : searchParamsResolved.filterType;

  const transactionType = filterType as "income" | "expense" | undefined;

  // sortBy: 'date' | 'amount' (read from 'sort' URL parameter)
  const sortBy = Array.isArray(searchParamsResolved.sort)
    ? searchParamsResolved.sort[0]
    : searchParamsResolved.sort;

  // order: 'asc' | 'desc'
  const order = Array.isArray(searchParamsResolved.order)
    ? searchParamsResolved.order[0]
    : searchParamsResolved.order;

  // categories: multiple category keys for filtering (comma-separated)
  const categories = searchParamsResolved.categories
    ? decodeURIComponent(String(searchParamsResolved.categories)).split(",").filter(Boolean)
    : undefined;

  try {
    const data = await loadTransactionsPageData({
      slugs,
      page,
      perPage,
      transactionType,
      financialYear,
      sortBy: sortBy as "date" | "amount" | undefined,
      order: order as "asc" | "desc" | undefined,
      categories,
    });

    const organization = data.politicalOrganizations.find((org) => org.slug === slug);
    const organizationName = organization?.displayName || "未登録の政治団体";
    const updatedAt = formatUpdatedAt(data.lastUpdatedAt ?? null);

    return (
      <MainColumn spacing="compact">
        <div className="flex flex-col gap-5">
          <Breadcrumbs
            parent={{ label: `${organizationName}の収支`, href: `/o/${slug}/${financialYear}` }}
            current="すべての出入金"
          />
          <SectionCard
            id="transactions"
            iconSrc="/icons/icon-cashback.svg"
            iconLabel="Cash move icon"
            eyebrow={`${organizationName}・${financialYear}年`}
            title="すべての出入金"
            updatedAt={updatedAt}
            headingLevel="h1"
          >
            <InteractiveTransactionTable
              slug={slug}
              year={financialYear}
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              perPage={data.perPage}
              totalPages={data.totalPages}
              selectedCategories={categories}
            />
          </SectionCard>
        </div>
        <SiteBottomBlock />
      </MainColumn>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      notFound();
    }

    throw error;
  }
}
