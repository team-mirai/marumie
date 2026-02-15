import "server-only";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import AboutSection from "@/client/components/common/AboutSection";
import AnotherPageLinkSection from "@/client/components/common/AnotherPageLinkSection";
import ExplanationSection from "@/client/components/common/ExplanationSection";
import FloatingBackButton from "@/client/components/common/FloatingBackButton";
import LinkCardsSection from "@/client/components/common/LinkCardsSection";
import TransparencySection from "@/client/components/common/TransparencySection";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumn from "@/client/components/layout/MainColumn";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import InteractiveTransactionTable from "@/client/components/top-page/features/transactions-table/InteractiveTransactionTable";
import ProgressSection from "@/client/components/top-page/ProgressSection";
import { loadTransactionsPageData } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-page-data";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { formatUpdatedAt } from "@/client/lib/format-date";

interface TransactionsPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
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
  const { slug } = await params;

  // slugの妥当性をチェックし、必要に応じてリダイレクト
  const { default: defaultSlug, organizations } = await loadOrganizations();
  if (!organizations.some((org) => org.slug === slug)) {
    redirect(`/o/${defaultSlug}/transactions`);
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

  const financialYear = 2025; // 固定値

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
    const updatedAt = formatUpdatedAt(data.lastUpdatedAt ?? null);

    return (
      <>
        <FloatingBackButton slug={slug} />
        <MainColumn>
          <MainColumnCard>
            <CardHeader
              icon={<Image src="/icons/icon-cashback.svg" alt="" width={30} height={30} />}
              organizationName={organization?.displayName || "未登録の政治団体"}
              title="すべての出入金"
              updatedAt={updatedAt}
              subtitle="これまでにデータ連携された出入金の明細"
            />

            <InteractiveTransactionTable
              slug={slug}
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              perPage={data.perPage}
              totalPages={data.totalPages}
              selectedCategories={categories}
            />
          </MainColumnCard>

          <TransparencySection title="党内の機密データの流出事故ではありません☺️" />
          <AnotherPageLinkSection currentSlug={slug} />
          <ProgressSection />
          <ExplanationSection />
          <AboutSection />
          <LinkCardsSection />
        </MainColumn>
      </>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      notFound();
    }

    throw error;
  }
}
