"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";
import { DeleteAllTransactionsUsecase } from "@/server/contexts/data-import/application/usecases/delete-all-transactions-usecase";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

export async function deleteAllTransactionsAction(organizationId?: string): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  await requireRole("political_fund");

  try {
    const repository = new PrismaTransactionRepository(prisma);
    const usecase = new DeleteAllTransactionsUsecase(repository);

    const result = await usecase.execute(organizationId);

    // データキャッシュを無効化してトランザクション一覧を更新
    updateTag("transactions-data");
    updateTag("transactions-for-csv");

    const cacheInvalidator = new WebappCacheInvalidator();
    await cacheInvalidator.invalidateWebappCache();

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
