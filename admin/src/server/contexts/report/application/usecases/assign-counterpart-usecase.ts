import "server-only";

import type { PrismaClient } from "@prisma/client";

export interface AssignCounterpartInput {
  transactionId: string;
  counterpartId: string;
}

export interface AssignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class AssignCounterpartUsecase {
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

  async execute(input: AssignCounterpartInput): Promise<AssignCounterpartResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, errors: ["無効なトランザクションIDです"] };
    }

    const counterpartBigIntId = this.parseBigIntId(input.counterpartId);
    if (counterpartBigIntId === null) {
      return { success: false, errors: ["無効な取引先IDです"] };
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionBigIntId },
    });
    if (!transaction) {
      return { success: false, errors: ["トランザクションが見つかりません"] };
    }

    const counterpart = await this.prisma.counterpart.findUnique({
      where: { id: counterpartBigIntId },
    });
    if (!counterpart) {
      return { success: false, errors: ["取引先が見つかりません"] };
    }

    await this.prisma.transactionCounterpart.upsert({
      where: {
        transactionId: transactionBigIntId,
      },
      create: {
        transactionId: transactionBigIntId,
        counterpartId: counterpartBigIntId,
      },
      update: {
        counterpartId: counterpartBigIntId,
      },
    });

    return { success: true };
  }
}

export interface UnassignCounterpartInput {
  transactionId: string;
}

export interface UnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class UnassignCounterpartUsecase {
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

  async execute(input: UnassignCounterpartInput): Promise<UnassignCounterpartResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, errors: ["無効なトランザクションIDです"] };
    }

    const existing = await this.prisma.transactionCounterpart.findUnique({
      where: { transactionId: transactionBigIntId },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.transactionCounterpart.delete({
      where: { transactionId: transactionBigIntId },
    });

    return { success: true };
  }
}
