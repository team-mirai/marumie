"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-counterpart.repository";
import {
  BulkUnassignCounterpartUsecase,
  type BulkUnassignCounterpartInput,
  type BulkUnassignCounterpartResult,
} from "@/server/contexts/report/application/usecases/bulk-unassign-counterpart-usecase";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";

export async function bulkUnassignCounterpartAction(
  input: BulkUnassignCounterpartInput,
): Promise<BulkUnassignCounterpartResult> {
  await requireRole("political_fund");

  const repository = new PrismaTransactionCounterpartRepository(prisma);
  const usecase = new BulkUnassignCounterpartUsecase(repository);
  const result = await usecase.execute(input);

  if (result.success) {
    revalidatePath("/counterparts/[id]", "page");
    revalidatePath("/assign/counterparts");
  }

  return result;
}
