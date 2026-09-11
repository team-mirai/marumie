import "server-only";

import { notFound } from "next/navigation";
import { loadCounterpartDetailPageData } from "@/server/contexts/report/presentation/loaders/counterparts-loader";
import { loadCounterpartTransactionsData } from "@/server/contexts/report/presentation/loaders/counterpart-detail-loader";
import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { CounterpartDetailClient } from "@/client/components/counterparts/CounterpartDetailClient";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";

interface CounterpartDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
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

  const [{ counterpart, usageCount, allCounterparts }, target] = await Promise.all([
    loadCounterpartDetailPageData(id),
    loadCurrentOrganizationTarget(),
  ]);

  if (!counterpart) {
    notFound();
  }

  if (!target) {
    return <TargetRequiredNotice label="Counterpart" title="取引先詳細" />;
  }

  const sortField =
    (searchParamsResolved.sort as "transactionDate" | "debitAmount" | "categoryKey") ||
    "transactionDate";
  const sortOrder = (searchParamsResolved.order as "asc" | "desc") || "desc";
  const parsedPage = searchParamsResolved.page ? Number.parseInt(searchParamsResolved.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const transactionsData = await loadCounterpartTransactionsData({
    counterpartId: id,
    politicalOrganizationId: target.organizationId,
    financialYear: target.year,
    page,
    perPage,
    sortField,
    sortOrder,
  });

  return (
    <CounterpartDetailClient
      key={`${target.organizationId}:${target.year}`}
      counterpart={{ ...counterpart, usageCount }}
      transactions={transactionsData.transactions}
      total={transactionsData.total}
      page={transactionsData.page}
      perPage={transactionsData.perPage}
      target={target}
      allCounterparts={allCounterparts}
      initialFilters={{
        sortField,
        sortOrder,
      }}
    />
  );
}
