import "server-only";

import { loadPoliticalOrganizationsData } from "@/server/contexts/shared/presentation/loaders/load-political-organizations-data";
import { loadTransactionsWithCounterpartsData } from "@/server/contexts/report/presentation/loaders/transactions-with-counterparts-loader";
import { loadAllCounterpartsData } from "@/server/contexts/report/presentation/loaders/counterparts-loader";
import { CounterpartAssignmentClient } from "@/client/components/counterpart-assignment/CounterpartAssignmentClient";

interface CounterpartAssignmentPageProps {
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

export default async function CounterpartAssignmentPage({
  searchParams,
}: CounterpartAssignmentPageProps) {
  const params = await searchParams;
  const organizations = await loadPoliticalOrganizationsData();

  const allCounterparts = await loadAllCounterpartsData();

  if (organizations.length === 0) {
    return (
      <CounterpartAssignmentClient
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
        allCounterparts={allCounterparts}
      />
    );
  }

  const politicalOrganizationId = params.orgId || organizations[0].id;
  const financialYear = params.year ? Number.parseInt(params.year, 10) : new Date().getFullYear();
  const unassignedOnly = params.unassigned === "true";
  const categoryKey = params.category || "";
  const searchQuery = params.search || "";
  const sortField =
    (params.sort as "transactionDate" | "debitAmount" | "categoryKey") || "transactionDate";
  const sortOrder = (params.order as "asc" | "desc") || "asc";
  const parsedPage = params.page ? Number.parseInt(params.page, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const perPage = 50;

  const data = await loadTransactionsWithCounterpartsData({
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
    <CounterpartAssignmentClient
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
      allCounterparts={allCounterparts}
    />
  );
}
