import "server-only";

import { loadCurrentOrganizationTarget } from "@/server/contexts/shared/presentation/loaders/load-current-organization-target";
import { loadTransactionsWithDonorsData } from "@/server/contexts/report/presentation/loaders/transactions-with-donors-loader";
import { loadAllDonorsData } from "@/server/contexts/report/presentation/loaders/donors-loader";
import { DonorAssignmentClient } from "@/client/components/donor-assignment/DonorAssignmentClient";
import { TargetRequiredNotice } from "@/client/components/layout/TargetRequiredNotice";
import { DONOR_REQUIRED_CATEGORIES } from "@/server/contexts/report/domain/models/donor-assignment-rules";
import { PL_CATEGORIES } from "@/shared/accounting/account-category";

function buildCategoryOptions(): { value: string; label: string }[] {
  const donorCategories = new Set([...DONOR_REQUIRED_CATEGORIES]);

  return Object.values(PL_CATEGORIES)
    .filter((mapping) => donorCategories.has(mapping.key))
    .map((mapping) => ({
      value: mapping.key,
      label: mapping.shortLabel || mapping.category,
    }));
}

interface DonorAssignmentPageProps {
  searchParams: Promise<{
    unassigned?: string;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function DonorAssignmentPage({ searchParams }: DonorAssignmentPageProps) {
  const target = await loadCurrentOrganizationTarget();

  if (!target) {
    return <TargetRequiredNotice label="Donor Assignment" title="寄付者紐付け管理" />;
  }

  const params = await searchParams;
  const allDonors = await loadAllDonorsData();
  const categoryOptions = buildCategoryOptions();

  const unassignedOnly = params.unassigned !== "false";
  const categoryKey = params.category || "";
  const searchQuery = params.search || "";
  const sortField =
    (params.sort as "transactionDate" | "debitAmount" | "categoryKey") || "transactionDate";
  const sortOrder = (params.order as "asc" | "desc") || "asc";
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const data = await loadTransactionsWithDonorsData({
    politicalOrganizationId: target.organizationId,
    financialYear: target.year,
    unassignedOnly,
    categoryKey: categoryKey || undefined,
    searchQuery: searchQuery || undefined,
    page,
    perPage,
    sortField,
    sortOrder,
  });

  return (
    <DonorAssignmentClient
      key={`${target.organizationId}:${target.year}`}
      target={target}
      initialTransactions={data.transactions}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      initialFilters={{
        unassignedOnly,
        categoryKey,
        searchQuery,
        sortField,
        sortOrder,
      }}
      categoryOptions={categoryOptions}
      allDonors={allDonors}
    />
  );
}
