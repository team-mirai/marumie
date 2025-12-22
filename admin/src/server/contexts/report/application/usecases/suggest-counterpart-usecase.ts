import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import {
  type CounterpartSuggestion,
  createDefaultSuggester,
} from "@/server/contexts/report/application/services/counterpart-suggester";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";
import { requiresCounterpartDetail } from "@/server/contexts/report/domain/models/counterpart-assignment-rules";

export interface SuggestCounterpartInput {
  transactionId: string;
  politicalOrganizationId: string;
  limit?: number;
}

export interface SuggestCounterpartResult {
  success: boolean;
  suggestions: CounterpartSuggestion[];
  errors?: string[];
}

export class SuggestCounterpartUsecase {
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

  async execute(input: SuggestCounterpartInput): Promise<SuggestCounterpartResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, suggestions: [], errors: ["無効なトランザクションIDです"] };
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionBigIntId },
      include: {
        transactionCounterparts: {
          include: {
            counterpart: true,
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, suggestions: [], errors: ["トランザクションが見つかりません"] };
    }

    const firstCounterpart = transaction.transactionCounterparts[0];
    const transactionType = transaction.transactionType as "income" | "expense";
    const transactionWithCounterpart: TransactionWithCounterpart = {
      id: transaction.id.toString(),
      transactionNo: transaction.transactionNo,
      transactionDate: transaction.transactionDate,
      financialYear: transaction.financialYear,
      transactionType,
      categoryKey: transaction.debitAccount,
      friendlyCategory: transaction.friendlyCategory,
      label: transaction.label,
      description: transaction.description,
      memo: transaction.memo,
      debitAmount: Number(transaction.debitAmount),
      creditAmount: Number(transaction.creditAmount),
      debitPartner: transaction.debitPartner,
      creditPartner: transaction.creditPartner,
      counterpart: firstCounterpart
        ? {
            id: firstCounterpart.counterpart.id.toString(),
            name: firstCounterpart.counterpart.name,
            address: firstCounterpart.counterpart.address,
          }
        : null,
      requiresCounterpart: requiresCounterpartDetail(
        transactionType,
        transaction.debitAccount,
        Number(transaction.debitAmount),
      ),
    };

    const repository = new PrismaCounterpartRepository(this.prisma);
    const suggester = createDefaultSuggester(repository);

    const suggestions = await suggester.suggest(
      transactionWithCounterpart,
      input.politicalOrganizationId,
      input.limit ?? 5,
    );

    return { success: true, suggestions };
  }
}
