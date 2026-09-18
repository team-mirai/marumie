import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { EXPENSE_ACCOUNTS, INCOME_ACCOUNTS } from "@/shared/accounting/account-category";
import type { MonthlyTransactionTotal } from "@/server/contexts/public-finance/domain/models/monthly-transaction-total";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";

/**
 * Prisma を使用した月別収支集計リポジトリ実装
 *
 * SQLでの GROUP BY ... SUM() による集計のみを行い、
 * マージ・ソートのドメインロジックはドメイン層に委譲する。
 *
 * 返金（収入科目が借方／支出科目が貸方に来る仕訳）は反対側に積まず、
 * 同じ側から差し引いた正味（ネット）として集計する。
 */
export class PrismaMonthlyAggregationRepository implements IMonthlyAggregationRepository {
  constructor(private prisma: PrismaClient) {}

  async getIncomeByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyTransactionTotal[]> {
    const organizationIdsBigInt = organizationIds.map((id) => BigInt(id));

    const results = await this.prisma.$queryRaw<
      Array<{ year: bigint; month: bigint; total_amount: number }>
    >`
      SELECT
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(
          CASE
            WHEN credit_account IN (${Prisma.join(INCOME_ACCOUNTS)}) THEN credit_amount
            WHEN debit_account IN (${Prisma.join(INCOME_ACCOUNTS)}) THEN -debit_amount
            ELSE 0
          END
        ) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type IN ('income', 'expense')
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
      ORDER BY year, month
    `;

    return results.map((item) => ({
      year: Number(item.year),
      month: Number(item.month),
      totalAmount: Number(item.total_amount),
    }));
  }

  async getExpenseByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyTransactionTotal[]> {
    const organizationIdsBigInt = organizationIds.map((id) => BigInt(id));

    const results = await this.prisma.$queryRaw<
      Array<{ year: bigint; month: bigint; total_amount: number }>
    >`
      SELECT
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(
          CASE
            WHEN debit_account IN (${Prisma.join(EXPENSE_ACCOUNTS)}) THEN debit_amount
            WHEN credit_account IN (${Prisma.join(EXPENSE_ACCOUNTS)}) THEN -credit_amount
            ELSE 0
          END
        ) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type IN ('income', 'expense')
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
      ORDER BY year, month
    `;

    return results.map((item) => ({
      year: Number(item.year),
      month: Number(item.month),
      totalAmount: Number(item.total_amount),
    }));
  }
}
