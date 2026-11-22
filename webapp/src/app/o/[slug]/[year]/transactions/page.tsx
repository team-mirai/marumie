import "server-only";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteBottomBlock from "@/client/components/common/SiteBottomBlock";
import TransparencySection from "@/client/components/common/TransparencySection";
import Breadcrumbs from "@/client/components/layout/Breadcrumbs";
import MainColumn from "@/client/components/layout/MainColumn";
import RevealOnScroll from "@/client/components/layout/RevealOnScroll";
import SectionCard from "@/client/components/layout/SectionCard";
import InteractiveTransactionTable from "@/client/components/top-page/features/transactions-table/InteractiveTransactionTable";
import { loadTransactionsPageData } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { PublishedFiscalYears } from "@/server/contexts/public-finance/domain/models/published-fiscal-years";
import { formatUpdatedAt } from "@/client/lib/format-date";
import { parseTransactionSort, type TransactionSort } from "@/client/lib/transaction-sort";
import type { TransactionListSortBy } from "@/server/contexts/public-finance/domain/repositories/transaction-list-repository.interface";

/** 並び順をサーバーでの並べ方にする。支出・収入が多い順は、収入をプラス・支出をマイナスとした金額で並べる */
const SERVER_SORT: Record<
  TransactionSort,
  { sortBy: TransactionListSortBy; order: "asc" | "desc" }
> = {
  new: { sortBy: "date", order: "desc" },
  old: { sortBy: "date", order: "asc" },
  amountDesc: { sortBy: "amount", order: "desc" },
  amountAsc: { sortBy: "amount", order: "asc" },
  expDesc: { sortBy: "signedAmount", order: "asc" },
  incDesc: { sortBy: "signedAmount", order: "desc" },
};

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
    title: organization?.displayName
      ? `${organization.displayName}のすべての出入金`
      : "すべての出入金",
  };
}

export default async function TransactionsPage({ params, searchParams }: TransactionsPageProps) {
  const { slug, year: yearParam } = await params;

  // 年度の妥当性をチェック
  const yearNumber = parseInt(yearParam, 10);
  const financialYear = PublishedFiscalYears.includes(yearNumber)
    ? yearNumber
    : PublishedFiscalYears.defaultYear;

  // 年度が不正な場合はデフォルト年度にリダイレクト
  if (financialYear !== yearNumber) {
    redirect(`/o/${slug}/${PublishedFiscalYears.defaultYear}/transactions`);
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

  // sort / order: 並び順（date / amount / expense / income と asc / desc）
  const sort = parseTransactionSort(
    Array.isArray(searchParamsResolved.sort)
      ? searchParamsResolved.sort[0]
      : searchParamsResolved.sort,
    Array.isArray(searchParamsResolved.order)
      ? searchParamsResolved.order[0]
      : searchParamsResolved.order,
  );

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
      ...SERVER_SORT[sort],
      categories,
    });

    const organization = data.politicalOrganizations.find((org) => org.slug === slug);
    const organizationName = organization?.displayName || "未登録の政治団体";
    const updatedAt = formatUpdatedAt(data.lastUpdatedAt ?? null);
    const parent = {
      label: `${organizationName}の収支・${financialYear}年`,
      href: `/o/${slug}/${financialYear}`,
    };

    return (
      <MainColumn spacing="compact">
        <div className="flex flex-col gap-5">
          <Breadcrumbs parent={parent} current="すべての出入金" />
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
              sort={sort}
            />
          </SectionCard>
        </div>
        <SiteBottomBlock band={<TransparencySection variant="transactions" />} />
        <Breadcrumbs parent={parent} current="すべての出入金" position="bottom" />
        <RevealOnScroll />
      </MainColumn>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      notFound();
    }

    throw error;
  }
}
