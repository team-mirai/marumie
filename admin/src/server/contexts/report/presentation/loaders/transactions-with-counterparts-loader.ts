import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import {
  GetTransactionsWithCounterpartsUsecase,
  type GetTransactionsWithCounterpartsInput,
  type GetTransactionsWithCounterpartsResult,
} from "@/server/contexts/report/application/usecases/get-transactions-with-counterparts-usecase";

const CACHE_REVALIDATE_SECONDS = 60;

export type LoadTransactionsWithCounterpartsInput = GetTransactionsWithCounterpartsInput;

export type LoadTransactionsWithCounterpartsResult = GetTransactionsWithCounterpartsResult;

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
    String(input.requiresCounterpartOnly ?? false),
    input.categoryKey ?? "",
    input.searchQuery ?? "",
    String(page),
    String(perPage),
    input.sortField ?? "transactionDate",
    input.sortOrder ?? "asc",
  ];

  const cachedLoader = unstable_cache(
    async (): Promise<LoadTransactionsWithCounterpartsResult> => {
      const repository = new PrismaReportTransactionRepository(prisma);
      const usecase = new GetTransactionsWithCounterpartsUsecase(repository);
      return usecase.execute(input);
    },
    cacheKey,
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
