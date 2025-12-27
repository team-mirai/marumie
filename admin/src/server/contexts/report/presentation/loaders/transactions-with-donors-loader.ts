import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import {
  GetTransactionsWithDonorsUsecase,
  type GetTransactionsWithDonorsInput,
  type GetTransactionsWithDonorsResult,
} from "@/server/contexts/report/application/usecases/get-transactions-with-donors-usecase";

const CACHE_REVALIDATE_SECONDS = 60;

export type LoadTransactionsWithDonorsInput = GetTransactionsWithDonorsInput;

export type LoadTransactionsWithDonorsResult = GetTransactionsWithDonorsResult;

export async function loadTransactionsWithDonorsData(
  input: LoadTransactionsWithDonorsInput,
): Promise<LoadTransactionsWithDonorsResult> {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 50;

  const cacheKey = [
    "transactions-with-donors",
    input.politicalOrganizationId,
    String(input.financialYear),
    String(input.unassignedOnly ?? false),
    String(input.requiresDonorOnly ?? false),
    input.categoryKey ?? "",
    input.searchQuery ?? "",
    String(page),
    String(perPage),
    input.sortField ?? "transactionDate",
    input.sortOrder ?? "asc",
  ];

  const cachedLoader = unstable_cache(
    async (): Promise<LoadTransactionsWithDonorsResult> => {
      const repository = new PrismaTransactionWithDonorRepository(prisma);
      const usecase = new GetTransactionsWithDonorsUsecase(repository);
      return usecase.execute(input);
    },
    cacheKey,
    { revalidate: CACHE_REVALIDATE_SECONDS },
  );

  return cachedLoader();
}
