import "server-only";

import type { PrismaClient } from "@prisma/client";

export interface BulkUnassignCounterpartInput {
  transactionIds: string[];
}

export interface BulkUnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class BulkUnassignCounterpartUsecase {
  constructor(private prisma: PrismaClient) {}

  private parseBigIntId(id: string): bigint | null {
    if (!/^\d+$/.test(id)) {
      return null;
    }
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async execute(input: BulkUnassignCounterpartInput): Promise<BulkUnassignCounterpartResult> {
    if (input.transactionIds.length === 0) {
      return {
        success: false,
        errors: ["取引が選択されていません"],
      };
    }

    const validTransactionIds: bigint[] = [];
    const invalidIds: string[] = [];

    for (const transactionId of input.transactionIds) {
      const bigIntId = this.parseBigIntId(transactionId);
      if (bigIntId === null) {
        invalidIds.push(transactionId);
      } else {
        validTransactionIds.push(bigIntId);
      }
    }

    if (validTransactionIds.length === 0) {
      return {
        success: false,
        errors: [`無効な取引ID: ${invalidIds.join(", ")}`],
      };
    }

    await this.prisma.transactionCounterpart.deleteMany({
      where: {
        transactionId: { in: validTransactionIds },
      },
    });

    return { success: true };
  }
}
