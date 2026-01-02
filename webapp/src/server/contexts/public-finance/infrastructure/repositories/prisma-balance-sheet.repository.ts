import "server-only";

import type { PrismaClient } from "@prisma/client";
import { PL_CATEGORIES, BS_CATEGORIES } from "@/shared/accounting/account-category";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";

/**
 * 勘定科目名定数（PL_CATEGORIESのキーから取得）
 * creditAccount / debitAccount でのクエリに使用
 */
const ACCOUNT_NAMES = {
  LOAN: Object.keys(PL_CATEGORIES).find((key) => PL_CATEGORIES[key].key === "loans") as string,
} as const;

/**
 * 負債勘定リスト（BS_CATEGORIESから抽出）
 */
const LIABILITY_ACCOUNTS = Object.keys(BS_CATEGORIES).filter(
  (account) => BS_CATEGORIES[account].type === "liability",
);

/**
 * Prisma を使用した貸借対照表リポジトリ実装
 *
 * SQLでの SUM() による集計のみを行い、
 * 貸借対照表の計算ロジックはドメイン層に委譲する。
 */
export class PrismaBalanceSheetRepository implements IBalanceSheetRepository {
  constructor(private prisma: PrismaClient) {}

  async getCurrentAssets(organizationIds: string[]): Promise<number> {
    if (organizationIds.length === 0) {
      return 0;
    }

    const result = await this.prisma.$queryRaw<
      Array<{
        total_balance: string;
      }>
    >`
      SELECT COALESCE(SUM(latest_balances.balance), 0)::text as total_balance
      FROM (
        SELECT DISTINCT ON (political_organization_id)
          balance
        FROM balance_snapshots
        WHERE political_organization_id = ANY(${organizationIds.map((id) => BigInt(id))})
        ORDER BY political_organization_id, snapshot_date DESC, updated_at DESC
      ) as latest_balances
    `;

    return Number(result[0]?.total_balance || 0);
  }

  async getBorrowingIncome(organizationIds: string[], financialYear: number): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      _sum: {
        creditAmount: true,
      },
      where: {
        politicalOrganizationId: {
          in: organizationIds.map((id) => BigInt(id)),
        },
        financialYear,
        creditAccount: ACCOUNT_NAMES.LOAN,
        transactionType: "income",
      },
    });

    return Number(result._sum.creditAmount) || 0;
  }

  async getBorrowingExpense(organizationIds: string[], financialYear: number): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      _sum: {
        debitAmount: true,
      },
      where: {
        politicalOrganizationId: {
          in: organizationIds.map((id) => BigInt(id)),
        },
        financialYear,
        debitAccount: ACCOUNT_NAMES.LOAN,
        transactionType: "expense",
      },
    });

    return Number(result._sum.debitAmount) || 0;
  }

  async getCurrentLiabilities(organizationIds: string[], financialYear: number): Promise<number> {
    if (LIABILITY_ACCOUNTS.length === 0) {
      return 0;
    }

    const debitResult = await this.prisma.transaction.aggregate({
      _sum: {
        debitAmount: true,
      },
      where: {
        politicalOrganizationId: {
          in: organizationIds.map((id) => BigInt(id)),
        },
        financialYear,
        debitAccount: {
          in: LIABILITY_ACCOUNTS,
        },
      },
    });

    const creditResult = await this.prisma.transaction.aggregate({
      _sum: {
        creditAmount: true,
      },
      where: {
        politicalOrganizationId: {
          in: organizationIds.map((id) => BigInt(id)),
        },
        financialYear,
        creditAccount: {
          in: LIABILITY_ACCOUNTS,
        },
      },
    });

    const debitTotal = Number(debitResult._sum.debitAmount) || 0;
    const creditTotal = Number(creditResult._sum.creditAmount) || 0;

    return creditTotal - debitTotal;
  }
}
