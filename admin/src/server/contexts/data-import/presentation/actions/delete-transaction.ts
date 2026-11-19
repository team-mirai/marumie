"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

export async function deleteTransactionAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireRole("political_fund");

  try {
    const repository = new PrismaTransactionRepository(prisma);
    await repository.delete(id);

    updateTag("transactions-data");
    updateTag("transactions-for-csv");

    const cacheInvalidator = new WebappCacheInvalidator();
    await cacheInvalidator.invalidateWebappCache();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
