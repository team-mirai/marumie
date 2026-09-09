import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import {
  GetTransactionsWithCounterpartsUsecase,
  type GetTransactionsWithCounterpartsInput,
  type GetTransactionsWithCounterpartsResult,
} from "@/server/contexts/report/application/usecases/get-transactions-with-counterparts-usecase";

type LoadTransactionsWithCounterpartsInput = GetTransactionsWithCounterpartsInput;

type LoadTransactionsWithCounterpartsResult = GetTransactionsWithCounterpartsResult;

export async function loadTransactionsWithCounterpartsData(
  input: LoadTransactionsWithCounterpartsInput,
): Promise<LoadTransactionsWithCounterpartsResult> {
  const repository = new PrismaReportTransactionRepository(prisma);
  const usecase = new GetTransactionsWithCounterpartsUsecase(repository);
  return usecase.execute(input);
}
