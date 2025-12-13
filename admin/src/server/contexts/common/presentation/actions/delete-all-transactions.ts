"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/common/infrastructure/repositories/prisma-transaction.repository";
import { DeleteAllTransactionsUsecase } from "@/server/contexts/common/application/usecases/delete-all-transactions-usecase";

export async function deleteAllTransactionsAction(
  organizationId?: string,
): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const repository = new PrismaTransactionRepository(prisma);
    const usecase = new DeleteAllTransactionsUsecase(repository);

    const result = await usecase.execute(organizationId);

    // データキャッシュを無効化してトランザクション一覧を更新
    revalidateTag("transactions-data");

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
