import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type { MonthlyAggregation } from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";

/**
 * Prisma を使用した月別収支集計リポジトリ実装
 */
export class PrismaMonthlyAggregationRepository implements IMonthlyAggregationRepository {
  constructor(private prisma: PrismaClient) {}

  async getByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAggregation[]> {
    const organizationIdsBigInt = organizationIds.map((id) => BigInt(id));

    const [incomeResults, expenseResults] = await Promise.all([
      this.prisma.$queryRaw<Array<{ year: bigint; month: bigint; total_amount: number }>>`
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
      `,
      this.prisma.$queryRaw<Array<{ year: bigint; month: bigint; total_amount: number }>>`
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
      `,
    ]);

    // 年月別のマップを作成
    const monthlyMap = new Map<string, { yearMonth: string; income: number; expense: number }>();

    // 収入データを追加
    for (const item of incomeResults) {
      const year = Number(item.year);
      const month = Number(item.month);
      const yearMonth = `${year}-${month.toString().padStart(2, "0")}`;
      if (!monthlyMap.has(yearMonth)) {
        monthlyMap.set(yearMonth, { yearMonth, income: 0, expense: 0 });
      }
      const existing = monthlyMap.get(yearMonth);
      if (existing) {
        existing.income = Number(item.total_amount);
      }
    }

    // 支出データを追加
    for (const item of expenseResults) {
      const year = Number(item.year);
      const month = Number(item.month);
      const yearMonth = `${year}-${month.toString().padStart(2, "0")}`;
      if (!monthlyMap.has(yearMonth)) {
        monthlyMap.set(yearMonth, { yearMonth, income: 0, expense: 0 });
      }
      const existing = monthlyMap.get(yearMonth);
      if (existing) {
        existing.expense = Number(item.total_amount);
      }
    }

    return Array.from(monthlyMap.values()).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }
}
