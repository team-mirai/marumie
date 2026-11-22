import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type { MonthlyAccountTotal } from "@/server/contexts/public-finance/domain/models/monthly-account-total";
import type { IMonthlyAggregationRepository } from "@/server/contexts/public-finance/domain/repositories/monthly-aggregation-repository.interface";

/**
 * Prisma を使用した月別収支集計リポジトリ実装
 *
 * SQLでの GROUP BY 年, 月, 勘定科目 ... SUM() による集計のみを行う。
 * どの科目を収入・支出に数えるか（返金の差し引き、借入金の返済など）は
 * サンキー図と同じくドメイン層（buildNetCategoryAggregation）に委譲する。
 */
export class PrismaMonthlyAggregationRepository implements IMonthlyAggregationRepository {
  constructor(private prisma: PrismaClient) {}

  async getCreditTotalsByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAccountTotal[]> {
    const organizationIdsBigInt = organizationIds.map((id) => BigInt(id));

    const results = await this.prisma.$queryRaw<
      Array<{ year: bigint; month: bigint; account: string | null; total_amount: number }>
    >`
      SELECT
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        credit_account as account,
        SUM(credit_amount) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type IN ('income', 'expense')
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), credit_account
      ORDER BY year, month
    `;

    return results.map(toMonthlyAccountTotal);
  }

  async getDebitTotalsByOrganizationIds(
    organizationIds: string[],
    financialYear: number,
  ): Promise<MonthlyAccountTotal[]> {
    const organizationIdsBigInt = organizationIds.map((id) => BigInt(id));

    const results = await this.prisma.$queryRaw<
      Array<{ year: bigint; month: bigint; account: string | null; total_amount: number }>
    >`
      SELECT
        EXTRACT(YEAR FROM transaction_date) as year,
        EXTRACT(MONTH FROM transaction_date) as month,
        debit_account as account,
        SUM(debit_amount) as total_amount
      FROM transactions
      WHERE political_organization_id IN (${Prisma.join(organizationIdsBigInt)})
        AND financial_year = ${financialYear}
        AND transaction_type IN ('income', 'expense')
      GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date), debit_account
      ORDER BY year, month
    `;

    return results.map(toMonthlyAccountTotal);
  }
}

function toMonthlyAccountTotal(item: {
  year: bigint;
  month: bigint;
  account: string | null;
  total_amount: number;
}): MonthlyAccountTotal {
  return {
    year: Number(item.year),
    month: Number(item.month),
    // サンキー図の集計（prisma-transaction.repository）と同じく、科目が空なら空文字として渡す
    account: item.account || "",
    amount: Number(item.total_amount || 0),
  };
}
