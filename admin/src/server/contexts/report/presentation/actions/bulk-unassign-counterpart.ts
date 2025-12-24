"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export interface BulkUnassignCounterpartInput {
  transactionIds: string[];
}

export interface BulkUnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export async function bulkUnassignCounterpartAction(
  input: BulkUnassignCounterpartInput,
): Promise<BulkUnassignCounterpartResult> {
  try {
    if (input.transactionIds.length === 0) {
      return {
        success: false,
        errors: ["取引が選択されていません"],
      };
    }

    const transactionBigIntIds = input.transactionIds.map((id) => {
      if (!/^\d+$/.test(id)) {
        throw new Error(`無効な取引ID: ${id}`);
      }
      return BigInt(id);
    });

    await prisma.transactionCounterpart.deleteMany({
      where: {
        transactionId: { in: transactionBigIntIds },
      },
    });

    revalidatePath("/counterparts/[id]", "page");
    revalidatePath("/assign/counterparts");

    return { success: true };
  } catch (error) {
    console.error("Failed to bulk unassign counterparts:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "一括紐付け解除に失敗しました"],
    };
  }
}
