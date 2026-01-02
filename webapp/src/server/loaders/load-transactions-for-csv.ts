import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/lib/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { PrismaTransactionRepository } from "@/server/repositories/prisma-transaction.repository";
import {
  type GetTransactionsForCsvParams,
  GetTransactionsForCsvUsecase,
} from "@/server/usecases/get-transactions-for-csv-usecase";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

export const loadTransactionsForCsv = (params: GetTransactionsForCsvParams) => {
  const cacheKey = `transactions-for-csv-${params.slugs.join("-")}-${params.financialYear}`;

  return unstable_cache(
    async () => {
      const transactionRepository = new PrismaTransactionRepository(prisma);
      const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
      const usecase = new GetTransactionsForCsvUsecase(
        transactionRepository,
        politicalOrganizationRepository,
      );

      return await usecase.execute(params);
    },
    [cacheKey],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions-for-csv"] },
  )();
};
