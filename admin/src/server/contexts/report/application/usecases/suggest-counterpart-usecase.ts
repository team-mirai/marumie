import "server-only";

import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import {
  type CounterpartSuggestion,
  createDefaultSuggester,
} from "@/server/contexts/report/application/services/counterpart-suggester";

export interface SuggestCounterpartInput {
  tenantId: bigint;
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
  constructor(
    private transactionRepository: ITransactionWithCounterpartRepository,
    private counterpartRepository: ICounterpartRepository,
  ) {}

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

    const transactionWithCounterpart =
      await this.transactionRepository.findByIdWithCounterpart(transactionBigIntId);

    if (!transactionWithCounterpart) {
      return { success: false, suggestions: [], errors: ["トランザクションが見つかりません"] };
    }

    const suggester = createDefaultSuggester(this.counterpartRepository);

    const suggestions = await suggester.suggest(
      transactionWithCounterpart,
      input.tenantId,
      input.politicalOrganizationId,
      input.limit ?? 5,
    );

    return { success: true, suggestions };
  }
}
