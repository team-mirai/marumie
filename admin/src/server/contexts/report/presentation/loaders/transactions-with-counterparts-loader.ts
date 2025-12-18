import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import type {
  TransactionWithCounterpart,
  TransactionWithCounterpartFilters,
} from "@/server/contexts/report/domain/models/transaction-with-counterpart";

const CACHE_REVALIDATE_SECONDS = 60;

export interface LoadTransactionsWithCounterpartsInput {
  politicalOrganizationId: string;
  financialYear: number;
  unassignedOnly?: boolean;
  aboveThresholdOnly?: boolean;
  categoryKey?: string;
  searchQuery?: string;
  page?: number;
  perPage?: number;
  sortField?: "transactionDate" | "debitAmount" | "categoryKey";
  sortOrder?: "asc" | "desc";
}

export interface LoadTransactionsWithCounterpartsResult {
  transactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
}

export async function loadTransactionsWithCounterpartsData(
  input: LoadTransactionsWithCounterpartsInput,
): Promise<LoadTransactionsWithCounterpartsResult> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;

  const cacheKey = [
    "transactions-with-counterparts",
    input.politicalOrganizationId,
    String(input.financialYear),
    String(input.unassignedOnly ?? false),
    String(input.aboveThresholdOnly ?? false),
    input.categoryKey ?? "",
    input.searchQuery ?? "",
    String(page),
    String(perPage),
    input.sortField ?? "transactionDate",
    input.sortOrder ?? "asc",
  ];

  const cachedLoader = unstable_cache(
    async (): Promise<LoadTransactionsWithCounterpartsResult> => {
      const offset = (page - 1) * perPage;

      const repository = new PrismaReportTransactionRepository(prisma);

      const filters: TransactionWithCounterpartFilters = {
        politicalOrganizationId: input.politicalOrganizationId,
        financialYear: input.financialYear,
        unassignedOnly: input.unassignedOnly,
        aboveThresholdOnly: input.aboveThresholdOnly,
        categoryKey: input.categoryKey,
        searchQuery: input.searchQuery,
        limit: perPage,
        offset,
        sortField: input.sortField,
        sortOrder: input.sortOrder,
      };

      const result = await repository.findTransactionsWithCounterparts(filters);

      return {
        transactions: result.transactions,
        total: result.total,
        page,
        perPage,
      };
    },
    cacheKey,
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
