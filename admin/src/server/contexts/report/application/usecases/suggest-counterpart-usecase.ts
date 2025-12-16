import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import {
  type CounterpartSuggestion,
  createDefaultSuggester,
} from "@/server/contexts/report/application/services/counterpart-suggester";
import { PrismaCounterpartRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-counterpart.repository";

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
        transactionCounterpart: {
          include: {
            counterpart: true,
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, suggestions: [], errors: ["トランザクションが見つかりません"] };
    }

    const transactionWithCounterpart: TransactionWithCounterpart = {
      id: transaction.id.toString(),
      transactionNo: transaction.transactionNo,
      transactionDate: transaction.transactionDate,
      financialYear: transaction.financialYear,
      transactionType: transaction.transactionType as "income" | "expense",
      categoryKey: transaction.debitAccount,
      friendlyCategory: transaction.friendlyCategory,
      label: transaction.label,
      description: transaction.description,
      memo: transaction.memo,
      debitAmount: transaction.debitAmount,
      creditAmount: transaction.creditAmount,
      debitPartner: transaction.debitPartner,
      creditPartner: transaction.creditPartner,
      counterpart: transaction.transactionCounterpart
        ? {
            id: transaction.transactionCounterpart.counterpart.id.toString(),
            name: transaction.transactionCounterpart.counterpart.name,
            address: transaction.transactionCounterpart.counterpart.address,
          }
        : null,
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
