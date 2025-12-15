import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  IBalanceSnapshotRepository,
  TotalBalancesByYear,
} from "./interfaces/balance-snapshot-repository.interface";

export class PrismaBalanceSnapshotRepository implements IBalanceSnapshotRepository {
  constructor(private prisma: PrismaClient) {}

  async getTotalLatestBalanceByOrgIds(orgIds: string[]): Promise<number> {
    if (orgIds.length === 0) {
      return 0;
    }

    // 各org_idごとに最新のスナップショットの残高の合計を取得
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
        WHERE political_organization_id = ANY(${orgIds.map((id) => BigInt(id))})
        ORDER BY political_organization_id, snapshot_date DESC, updated_at DESC
      ) as latest_balances
    `;

    return Number(result[0]?.total_balance || 0);
  }

  async getTotalLatestBalancesByYear(
    orgIds: string[],
    currentYear: number,
  ): Promise<TotalBalancesByYear> {
    if (orgIds.length === 0) {
      return { currentYear: 0, previousYear: 0 };
    }

    const previousYear = currentYear - 1;

    // 今年と昨年の最新残高を一度に取得
    const result = await this.prisma.$queryRaw<
      Array<{
        year: number;
        total_balance: string;
      }>
    >`
      SELECT
        year,
        COALESCE(SUM(balance), 0)::text as total_balance
      FROM (
        SELECT DISTINCT ON (political_organization_id, year)
          EXTRACT(YEAR FROM snapshot_date)::int as year,
          balance
        FROM balance_snapshots
        WHERE political_organization_id = ANY(${orgIds.map((id) => BigInt(id))})
          AND EXTRACT(YEAR FROM snapshot_date) IN (${currentYear}, ${previousYear})
        ORDER BY political_organization_id, year, snapshot_date DESC, updated_at DESC
      ) as latest_balances_by_year
      GROUP BY year
      ORDER BY year
    `;

    const currentYearBalance = result.find((r) => r.year === currentYear)?.total_balance || "0";
    const previousYearBalance = result.find((r) => r.year === previousYear)?.total_balance || "0";

    return {
      currentYear: Number(currentYearBalance),
      previousYear: Number(previousYearBalance),
    };
  }
}
