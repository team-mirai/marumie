import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import {
  GetTransactionsWithDonorsUsecase,
  type GetTransactionsWithDonorsInput,
  type GetTransactionsWithDonorsResult,
} from "@/server/contexts/report/application/usecases/get-transactions-with-donors-usecase";

type LoadTransactionsWithDonorsInput = GetTransactionsWithDonorsInput;

type LoadTransactionsWithDonorsResult = GetTransactionsWithDonorsResult;

export async function loadTransactionsWithDonorsData(
  input: LoadTransactionsWithDonorsInput,
): Promise<LoadTransactionsWithDonorsResult> {
  const repository = new PrismaTransactionWithDonorRepository(prisma);
  const usecase = new GetTransactionsWithDonorsUsecase(repository);
  return usecase.execute(input);
}
