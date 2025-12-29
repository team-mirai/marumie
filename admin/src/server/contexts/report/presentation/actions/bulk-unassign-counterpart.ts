"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-counterpart.repository";
import {
  BulkUnassignCounterpartUsecase,
  type BulkUnassignCounterpartInput,
  type BulkUnassignCounterpartResult,
} from "@/server/contexts/report/application/usecases/bulk-unassign-counterpart-usecase";

export async function bulkUnassignCounterpartAction(
  input: BulkUnassignCounterpartInput,
): Promise<BulkUnassignCounterpartResult> {
  const repository = new PrismaTransactionCounterpartRepository(prisma);
  const usecase = new BulkUnassignCounterpartUsecase(repository);
  const result = await usecase.execute(input);

  if (result.success) {
    revalidatePath("/counterparts/[id]", "page");
    revalidatePath("/assign/counterparts");
  }

  return result;
}
