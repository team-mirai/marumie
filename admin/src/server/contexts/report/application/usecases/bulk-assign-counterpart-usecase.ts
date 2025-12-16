import "server-only";

import type { PrismaClient } from "@prisma/client";

export interface BulkAssignCounterpartInput {
  transactionIds: string[];
  counterpartId: string;
}

export interface BulkAssignCounterpartResult {
  success: boolean;
  successCount: number;
  failedIds: string[];
  errors?: string[];
}

export class BulkAssignCounterpartUsecase {
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

  async execute(input: BulkAssignCounterpartInput): Promise<BulkAssignCounterpartResult> {
    if (input.transactionIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds: [],
        errors: ["トランザクションが選択されていません"],
      };
    }

    const counterpartBigIntId = this.parseBigIntId(input.counterpartId);
    if (counterpartBigIntId === null) {
      return { success: false, successCount: 0, failedIds: [], errors: ["無効な取引先IDです"] };
    }

    const counterpart = await this.prisma.counterpart.findUnique({
      where: { id: counterpartBigIntId },
    });
    if (!counterpart) {
      return { success: false, successCount: 0, failedIds: [], errors: ["取引先が見つかりません"] };
    }

    const validTransactionIds: bigint[] = [];
    const failedIds: string[] = [];

    for (const transactionId of input.transactionIds) {
      const bigIntId = this.parseBigIntId(transactionId);
      if (bigIntId === null) {
        failedIds.push(transactionId);
        continue;
      }
      validTransactionIds.push(bigIntId);
    }

    if (validTransactionIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds: input.transactionIds,
        errors: ["有効なトランザクションIDがありません"],
      };
    }

    const existingTransactions = await this.prisma.transaction.findMany({
      where: { id: { in: validTransactionIds } },
      select: { id: true },
    });

    const existingTransactionIdSet = new Set(existingTransactions.map((t) => t.id));
    const validExistingIds: bigint[] = [];

    for (const id of validTransactionIds) {
      if (existingTransactionIdSet.has(id)) {
        validExistingIds.push(id);
      } else {
        failedIds.push(id.toString());
      }
    }

    if (validExistingIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds,
        errors: ["存在するトランザクションがありません"],
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transactionCounterpart.deleteMany({
        where: { transactionId: { in: validExistingIds } },
      });

      await tx.transactionCounterpart.createMany({
        data: validExistingIds.map((transactionId) => ({
          transactionId,
          counterpartId: counterpartBigIntId,
        })),
      });
    });

    return {
      success: true,
      successCount: validExistingIds.length,
      failedIds,
    };
  }
}
