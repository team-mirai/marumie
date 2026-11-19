import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaReportTransactionRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-report-transaction.repository";
import {
  GetCounterpartTransactionsUsecase,
  type GetCounterpartTransactionsInput,
  type GetCounterpartTransactionsResult,
} from "@/server/contexts/report/application/usecases/get-counterpart-transactions-usecase";

type LoadCounterpartTransactionsInput = GetCounterpartTransactionsInput;

type LoadCounterpartTransactionsResult = GetCounterpartTransactionsResult;

export async function loadCounterpartTransactionsData(
  input: LoadCounterpartTransactionsInput,
): Promise<LoadCounterpartTransactionsResult> {
  const repository = new PrismaReportTransactionRepository(prisma);
  const usecase = new GetCounterpartTransactionsUsecase(repository);
  return usecase.execute(input);
}
