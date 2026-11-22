import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaMonthlyAggregationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-monthly-aggregation.repository";

/**
 * $queryRaw の呼び出しを記録し、組み立てられた SQL を検査できるようにする簡易モック
 */
const createPrismaMock = (
  rows: Array<{ year: bigint; month: bigint; account: string | null; total_amount: number | null }> = [
    { year: BigInt(2026), month: BigInt(8), account: "個人からの寄附", total_amount: 1000 },
  ],
) => {
  const queryRaw = jest.fn(async (..._args: unknown[]) => rows);

  return {
    prisma: { $queryRaw: queryRaw } as unknown as PrismaClient,
    queryRaw,
  };
};

/**
 * $queryRaw に渡されたタグ付きテンプレートを Prisma.Sql に組み立て直す
 */
const toSql = (args: unknown[]): Prisma.Sql => {
  const [strings, ...values] = args as [TemplateStringsArray, ...unknown[]];
  return Prisma.sql(strings, ...values);
};

describe("PrismaMonthlyAggregationRepository", () => {
  describe("getCreditTotalsByOrganizationIds", () => {
    it("月・貸方科目ごとに貸方金額を合計し、科目で収支を分類しない", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getCreditTotalsByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      expect(sql.text).toMatch(/SUM\(credit_amount\)/);
      expect(sql.text).toMatch(/GROUP BY .*credit_account/);
      expect(sql.text).not.toMatch(/CASE/);
      expect(sql.text).toMatch(/transaction_type IN \('income', 'expense'\)/);
    });

    it("SQL の結果を年・月・科目・合計に変換して返す", async () => {
      const { prisma } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      const result = await repository.getCreditTotalsByOrganizationIds(["1"], 2026);

      expect(result).toEqual([{ year: 2026, month: 8, account: "個人からの寄附", amount: 1000 }]);
    });

    it("科目が空なら空文字、合計が空なら 0 として返す", async () => {
      const { prisma } = createPrismaMock([
        { year: BigInt(2026), month: BigInt(8), account: null, total_amount: null },
      ]);
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      const result = await repository.getCreditTotalsByOrganizationIds(["1"], 2026);

      expect(result).toEqual([{ year: 2026, month: 8, account: "", amount: 0 }]);
    });
  });

  describe("getDebitTotalsByOrganizationIds", () => {
    it("月・借方科目ごとに借方金額を合計し、科目で収支を分類しない", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getDebitTotalsByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      expect(sql.text).toMatch(/SUM\(debit_amount\)/);
      expect(sql.text).toMatch(/GROUP BY .*debit_account/);
      expect(sql.text).not.toMatch(/CASE/);
      expect(sql.text).toMatch(/transaction_type IN \('income', 'expense'\)/);
    });

    it("SQL の結果を年・月・科目・合計に変換して返す", async () => {
      const { prisma } = createPrismaMock([
        { year: BigInt(2026), month: BigInt(3), account: "事務所費", total_amount: 500 },
      ]);
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      const result = await repository.getDebitTotalsByOrganizationIds(["1"], 2026);

      expect(result).toEqual([{ year: 2026, month: 3, account: "事務所費", amount: 500 }]);
    });
  });
});
