import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import {
  GetCounterpartTransactionsUsecase,
  type GetCounterpartTransactionsInput,
  type GetCounterpartTransactionsResult,
} from "@/server/contexts/report/application/usecases/get-counterpart-transactions-usecase";

const CACHE_REVALIDATE_SECONDS = 60;

export type LoadCounterpartTransactionsInput = GetCounterpartTransactionsInput;

export type LoadCounterpartTransactionsResult = GetCounterpartTransactionsResult;

export async function loadCounterpartTransactionsData(
  input: LoadCounterpartTransactionsInput,
): Promise<LoadCounterpartTransactionsResult> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;

  const cacheKey = [
    "counterpart-transactions",
    input.counterpartId,
    input.politicalOrganizationId ?? "",
    String(input.financialYear ?? ""),
    String(page),
    String(perPage),
    input.sortField ?? "transactionDate",
    input.sortOrder ?? "desc",
  ];

  const cachedLoader = unstable_cache(
    async (): Promise<LoadCounterpartTransactionsResult> => {
      const repository = new PrismaReportTransactionRepository(prisma);
      const usecase = new GetCounterpartTransactionsUsecase(repository);
      return usecase.execute(input);
    },
    cacheKey,
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
