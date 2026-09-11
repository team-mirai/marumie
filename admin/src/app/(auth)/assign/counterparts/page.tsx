import "server-only";

import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { loadTransactionsWithCounterpartsData } from "@/server/contexts/report/presentation/loaders/transactions-with-counterparts-loader";
import { loadAllCounterpartsData } from "@/server/contexts/report/presentation/loaders/counterparts-loader";
import { CounterpartAssignmentClient } from "@/client/components/counterpart-assignment/CounterpartAssignmentClient";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import {
  COUNTERPART_REQUIRED_INCOME_CATEGORIES,
  COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
} from "@/server/contexts/report/domain/models/counterpart-assignment-rules";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";

/**
 * Counterpart紐付け対象カテゴリのオプションを生成
 */
function buildCategoryOptions(): { value: string; label: string }[] {
  const counterpartCategories = new Set([
    ...COUNTERPART_REQUIRED_INCOME_CATEGORIES,
    ...COUNTERPART_REQUIRED_EXPENSE_CATEGORIES,
  ]);

  return Object.values(PL_CATEGORIES)
    .filter((mapping) => counterpartCategories.has(mapping.key))
    .map((mapping) => ({
      value: mapping.key,
      label: mapping.shortLabel || mapping.category,
    }));
}

interface CounterpartAssignmentPageProps {
  searchParams: Promise<{
    unassigned?: string;
    counterpartRequired?: string;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function CounterpartAssignmentPage({
  searchParams,
}: CounterpartAssignmentPageProps) {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Counterpart Assignment" title="取引先紐付け管理" />;
  }

  const params = await searchParams;
  const allCounterparts = await loadAllCounterpartsData();
  const categoryOptions = buildCategoryOptions();

  const unassignedOnly = params.unassigned !== "false";
  const counterpartRequiredOnly = params.counterpartRequired !== "false";
  const categoryKey = params.category || "";
  const searchQuery = params.search || "";
  const sortField =
    (params.sort as "transactionDate" | "debitAmount" | "categoryKey") || "transactionDate";
  const sortOrder = (params.order as "asc" | "desc") || "asc";
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const data = await loadTransactionsWithCounterpartsData({
    politicalOrganizationId: target.organizationId,
    financialYear: target.year,
    unassignedOnly,
    requiresCounterpartOnly: counterpartRequiredOnly,
    categoryKey: categoryKey || undefined,
    searchQuery: searchQuery || undefined,
    page,
    perPage,
    sortField,
    sortOrder,
  });

  return (
    <CounterpartAssignmentClient
      key={`${target.organizationId}:${target.year}`}
      target={target}
      initialTransactions={data.transactions}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      initialFilters={{
        unassignedOnly,
        counterpartRequiredOnly,
        categoryKey,
        searchQuery,
        sortField,
        sortOrder,
      }}
      categoryOptions={categoryOptions}
      allCounterparts={allCounterparts}
    />
  );
}
