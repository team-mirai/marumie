import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type { MonthlyTransactionTotal } from "@/server/contexts/public-finance/domain/models/monthly-transaction-total";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";

/**
 * Prisma を使用した月別収支集計リポジトリ実装
 *
 * SQLでの GROUP BY ... SUM() による集計のみを行い、
 * マージ・ソートのドメインロジックはドメイン層に委譲する。
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
        SUM(credit_amount) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type = 'income'
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
        SUM(debit_amount) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type = 'expense'
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
