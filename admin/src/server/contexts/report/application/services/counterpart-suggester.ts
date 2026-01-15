import "server-only";

import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

export interface CounterpartSuggestion {
  counterpart: Counterpart;
  score: number;
  reason: string;
}

export interface SuggestionContext {
  tenantId: bigint;
  politicalOrganizationId: string;
  repository: ICounterpartRepository;
}

export interface SuggestionStrategy {
  suggest(
    transaction: TransactionWithCounterpart,
    context: SuggestionContext,
  ): Promise<CounterpartSuggestion[]>;
}

export class FrequencyStrategy implements SuggestionStrategy {
  private readonly baseScore = 50;
  private readonly maxBonus = 30;

  async suggest(
    _transaction: TransactionWithCounterpart,
    context: SuggestionContext,
  ): Promise<CounterpartSuggestion[]> {
    const frequentCounterparts = await context.repository.findByUsageFrequency(
      context.tenantId,
      context.politicalOrganizationId,
      10,
    );

    return frequentCounterparts.map((cp, index) => ({
      counterpart: {
        id: cp.id,
        name: cp.name,
        postalCode: cp.postalCode,
        address: cp.address,
        tenantId: cp.tenantId,
        createdAt: cp.createdAt,
        updatedAt: cp.updatedAt,
      },
      score: this.baseScore + this.maxBonus - index * 3,
      reason: `使用回数: ${cp.usageCount}回`,
    }));
  }
}

export class PartnerNameStrategy implements SuggestionStrategy {
  private readonly baseScore = 80;

  async suggest(
    transaction: TransactionWithCounterpart,
    context: SuggestionContext,
  ): Promise<CounterpartSuggestion[]> {
    const partnerName = transaction.debitPartner || transaction.creditPartner;
    if (!partnerName) {
      return [];
    }

    const matchingCounterparts = await context.repository.findByPartnerName(
      context.tenantId,
      context.politicalOrganizationId,
      partnerName,
    );

    return matchingCounterparts.map((cp, index) => ({
      counterpart: {
        id: cp.id,
        name: cp.name,
        postalCode: cp.postalCode,
        address: cp.address,
        tenantId: cp.tenantId,
        createdAt: cp.createdAt,
        updatedAt: cp.updatedAt,
      },
      score: this.baseScore - index * 5,
      reason: `取引先名「${partnerName}」で過去${cp.usageCount}回使用`,
    }));
  }
}

export class CounterpartSuggester {
  constructor(
    private strategies: SuggestionStrategy[],
    private repository: ICounterpartRepository,
  ) {}

  async suggest(
    transaction: TransactionWithCounterpart,
    tenantId: bigint,
    politicalOrganizationId: string,
    limit = 5,
  ): Promise<CounterpartSuggestion[]> {
    const context: SuggestionContext = {
      tenantId,
      politicalOrganizationId,
      repository: this.repository,
    };

    const allSuggestions: CounterpartSuggestion[] = [];
    for (const strategy of this.strategies) {
      const suggestions = await strategy.suggest(transaction, context);
      allSuggestions.push(...suggestions);
    }

    const aggregated = this.aggregateScores(allSuggestions);

    return aggregated.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private aggregateScores(suggestions: CounterpartSuggestion[]): CounterpartSuggestion[] {
    const counterpartMap = new Map<
      string,
      { counterpart: Counterpart; totalScore: number; reasons: string[] }
    >();

    for (const suggestion of suggestions) {
      const existing = counterpartMap.get(suggestion.counterpart.id);
      if (existing) {
        existing.totalScore += suggestion.score;
        if (!existing.reasons.includes(suggestion.reason)) {
          existing.reasons.push(suggestion.reason);
        }
      } else {
        counterpartMap.set(suggestion.counterpart.id, {
          counterpart: suggestion.counterpart,
          totalScore: suggestion.score,
          reasons: [suggestion.reason],
        });
      }
    }

    return Array.from(counterpartMap.values()).map((item) => ({
      counterpart: item.counterpart,
      score: item.totalScore,
      reason: item.reasons.join(", "),
    }));
  }
}

export function createDefaultSuggester(repository: ICounterpartRepository): CounterpartSuggester {
  const strategies: SuggestionStrategy[] = [new PartnerNameStrategy(), new FrequencyStrategy()];

  return new CounterpartSuggester(strategies, repository);
}
