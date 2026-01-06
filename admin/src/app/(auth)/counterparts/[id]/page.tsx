import "server-only";

import { notFound } from "next/navigation";
import { loadCounterpartDetailPageData } from "@/server/contexts/report/presentation/loaders/counterparts-loader";
import { loadCounterpartTransactionsData } from "@/server/contexts/report/presentation/loaders/counterpart-detail-loader";
import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { CounterpartDetailClient } from "@/client/components/counterparts/CounterpartDetailClient";

interface CounterpartDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    orgId?: string;
    year?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function CounterpartDetailPage({
  params,
  searchParams,
}: CounterpartDetailPageProps) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;

  const [{ counterpart, usageCount, allCounterparts }, organizations] = await Promise.all([
    loadCounterpartDetailPageData(id),
    loadPoliticalOrganizationsData(),
  ]);

  if (!counterpart) {
    notFound();
  }

  const politicalOrganizationId = searchParamsResolved.orgId || "";
  const financialYear = searchParamsResolved.year
    ? Number.parseInt(searchParamsResolved.year, 10)
    : new Date().getFullYear();
  const sortField =
    (searchParamsResolved.sort as "transactionDate" | "debitAmount" | "categoryKey") ||
    "transactionDate";
  const sortOrder = (searchParamsResolved.order as "asc" | "desc") || "desc";
  const parsedPage = searchParamsResolved.page ? Number.parseInt(searchParamsResolved.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const transactionsData = await loadCounterpartTransactionsData({
    counterpartId: id,
    politicalOrganizationId: politicalOrganizationId || undefined,
    financialYear,
    page,
    perPage,
    sortField,
    sortOrder,
  });

  return (
    <CounterpartDetailClient
      counterpart={{ ...counterpart, usageCount }}
      transactions={transactionsData.transactions}
      total={transactionsData.total}
      page={transactionsData.page}
      perPage={transactionsData.perPage}
      organizations={organizations}
      allCounterparts={allCounterparts}
      initialFilters={{
        politicalOrganizationId,
        financialYear,
        sortField,
        sortOrder,
      }}
    />
  );
}
