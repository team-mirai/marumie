import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaMonthlyAggregationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-monthly-aggregation.repository";

/**
 * $queryRaw の呼び出しを記録し、組み立てられた SQL を検査できるようにする簡易モック
 */
const createPrismaMock = () => {
  const queryRaw = jest.fn(async (..._args: unknown[]) => [
    { year: BigInt(2026), month: BigInt(8), total_amount: 1000 },
  ]);

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

const countValue = (sql: Prisma.Sql, value: string) =>
  sql.values.filter((v) => v === value).length;

describe("PrismaMonthlyAggregationRepository", () => {
  describe("getIncomeByOrganizationIds", () => {
    it("借方の借入金（返済）は収入から差し引かない", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getIncomeByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      // 借入金は貸方（借入れ）の収入科目としてだけ現れ、借方で差し引く科目には含まれない
      expect(countValue(sql, "借入金")).toBe(1);
      // 他の収入科目は貸方の加算と借方の差し引きの両方に現れる
      expect(countValue(sql, "個人からの寄附")).toBe(2);
    });

    it("貸方の加算と借方の差し引きを別々の CASE で評価して合算する", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getIncomeByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      expect(sql.text).toMatch(/THEN credit_amount\s+ELSE 0\s+END\s+\+ CASE\s+WHEN debit_account IN/);
    });

    it("SQL の結果を年・月・合計に変換して返す", async () => {
      const { prisma } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      const result = await repository.getIncomeByOrganizationIds(["1"], 2026);

      expect(result).toEqual([{ year: 2026, month: 8, totalAmount: 1000 }]);
    });
  });

  describe("getExpenseByOrganizationIds", () => {
    it("借方の借入金（返済）を支出に計上する", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getExpenseByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      expect(countValue(sql, "借入金")).toBe(1);
      expect(sql.text).toMatch(/WHEN debit_account = \$\d+ THEN debit_amount/);
    });

    it("借方の加算と貸方の差し引きを別々の CASE で評価して合算する", async () => {
      const { prisma, queryRaw } = createPrismaMock();
      const repository = new PrismaMonthlyAggregationRepository(prisma);

      await repository.getExpenseByOrganizationIds(["1"], 2026);

      const sql = toSql(queryRaw.mock.calls[0]);
      // 借方が借入金・貸方が支出科目の仕訳でも、返済の加算と返金の差し引きの両方が効く
      expect(sql.text).toMatch(
        /WHEN debit_account = \$\d+ THEN debit_amount\s+ELSE 0\s+END\s+\+ CASE\s+WHEN credit_account IN/,
      );
    });
  });
});
