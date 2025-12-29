import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { loadTransactionsWithDonorsData } from "@/server/contexts/report/presentation/loaders/transactions-with-donors-loader";
import { loadAllDonorsData } from "@/server/contexts/report/presentation/loaders/donors-loader";
import { DonorAssignmentClient } from "@/client/components/donor-assignment/DonorAssignmentClient";
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
    orgId?: string;
    year?: string;
    unassigned?: string;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function DonorAssignmentPage({ searchParams }: DonorAssignmentPageProps) {
  const params = await searchParams;
  const organizations = await loadPoliticalOrganizationsData();

  const allDonors = await loadAllDonorsData();

  const categoryOptions = buildCategoryOptions();

  if (organizations.length === 0) {
    return (
      <DonorAssignmentClient
        organizations={[]}
        initialTransactions={[]}
        total={0}
        page={1}
        perPage={50}
        initialFilters={{
          politicalOrganizationId: "",
          financialYear: new Date().getFullYear(),
          unassignedOnly: false,
          categoryKey: "",
          searchQuery: "",
          sortField: "transactionDate",
          sortOrder: "asc",
        }}
        allDonors={allDonors}
        categoryOptions={categoryOptions}
      />
    );
  }

  const politicalOrganizationId = params.orgId || organizations[0].id;
  const financialYear = params.year ? Number.parseInt(params.year, 10) : new Date().getFullYear();
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
    politicalOrganizationId,
    financialYear,
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
      organizations={organizations}
      initialTransactions={data.transactions}
      total={data.total}
      page={data.page}
      perPage={data.perPage}
      initialFilters={{
        politicalOrganizationId,
        financialYear,
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
