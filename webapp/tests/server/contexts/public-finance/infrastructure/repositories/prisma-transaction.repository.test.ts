import type { PrismaClient } from "@prisma/client";
import { PrismaTransactionRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-transaction.repository";

type GroupByArgs = {
  by: string[];
  where: Record<string, unknown>;
};

/**
 * groupBy の呼び出しを by（グループ化キー）で判別して結果を返す簡易モック
 */
const createPrismaMock = (rows: {
  credit: Array<Record<string, unknown>>;
  debit: Array<Record<string, unknown>>;
}) => {
  const groupBy = jest.fn(async (args: GroupByArgs) =>
    args.by.includes("creditAccount") ? rows.credit : rows.debit,
  );

  return {
    prisma: { transaction: { groupBy } } as unknown as PrismaClient,
    groupBy,
  };
};

describe("PrismaTransactionRepository#getCategoryAggregationForSankey", () => {
  describe("political-category モード", () => {
    it("借方に来た収入科目（収入の返金）を収入から差し引く", async () => {
      const { prisma } = createPrismaMock({
        credit: [
          { creditAccount: "個人からの寄附", _sum: { creditAmount: 1000000 } },
          { creditAccount: "普通預金", _sum: { creditAmount: 150000 } },
        ],
        debit: [
          { debitAccount: "普通預金", _sum: { debitAmount: 1000000 } },
          { debitAccount: "個人からの寄附", _sum: { debitAmount: 150000 } },
        ],
      });
      const repository = new PrismaTransactionRepository(prisma);

      const result = await repository.getCategoryAggregationForSankey(["1"], 2026);

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "個人からの寄附", totalAmount: 850000 },
      ]);
      expect(result.expense).toEqual([]);
    });

    it("貸方に来た支出科目（支出の返金）を支出から差し引く", async () => {
      const { prisma } = createPrismaMock({
        credit: [
          { creditAccount: "普通預金", _sum: { creditAmount: 500000 } },
          { creditAccount: "組織活動費", _sum: { creditAmount: 20000 } },
        ],
        debit: [
          { debitAccount: "組織活動費", _sum: { debitAmount: 500000 } },
          { debitAccount: "普通預金", _sum: { debitAmount: 20000 } },
        ],
      });
      const repository = new PrismaTransactionRepository(prisma);

      const result = await repository.getCategoryAggregationForSankey(["1"], 2026);

      expect(result.income).toEqual([]);
      expect(result.expense).toEqual([
        { category: "政治活動費", subcategory: "組織活動費", totalAmount: 480000 },
      ]);
    });

    it("相殺項目（offset系）を集計対象から除外する", async () => {
      const { prisma, groupBy } = createPrismaMock({ credit: [], debit: [] });
      const repository = new PrismaTransactionRepository(prisma);

      await repository.getCategoryAggregationForSankey(["1", "2"], 2026);

      expect(groupBy).toHaveBeenCalledTimes(2);
      for (const call of groupBy.mock.calls) {
        expect(call[0].where).toEqual({
          politicalOrganizationId: { in: [BigInt(1), BigInt(2)] },
          financialYear: 2026,
          transactionType: { in: ["income", "expense"] },
        });
      }
    });
  });

  describe("friendly-category モード", () => {
    it("タグ単位でも返金を正味として集計する", async () => {
      const { prisma, groupBy } = createPrismaMock({
        credit: [
          {
            creditAccount: "個人からの寄附",
            friendlyCategory: "寄附",
            _sum: { creditAmount: 1000000 },
          },
          { creditAccount: "普通預金", friendlyCategory: "", _sum: { creditAmount: 150000 } },
        ],
        debit: [
          { debitAccount: "普通預金", friendlyCategory: "寄附", _sum: { debitAmount: 1000000 } },
          {
            debitAccount: "個人からの寄附",
            friendlyCategory: "寄附",
            _sum: { debitAmount: 150000 },
          },
        ],
      });
      const repository = new PrismaTransactionRepository(prisma);

      const result = await repository.getCategoryAggregationForSankey(
        ["1"],
        2026,
        "friendly-category",
      );

      expect(result.income).toEqual([
        { category: "寄附", subcategory: "寄附", totalAmount: 850000 },
      ]);
      expect(result.expense).toEqual([]);
      expect(groupBy.mock.calls[0][0].by).toContain("friendlyCategory");
    });
  });
});

describe("PrismaTransactionRepository#findWithPagination（収入をプラス・支出をマイナスとした金額の順）", () => {
  type Row = {
    id: bigint;
    politicalOrganizationId: bigint;
    transactionType: "income" | "expense";
    debitAmount: number;
    creditAmount: number;
  };
  type FindManyArgs = {
    where: { AND?: [unknown, { transactionType: string }] };
    orderBy: Array<Record<string, "asc" | "desc">>;
    skip: number;
    take: number;
  };

  const row = (id: number, transactionType: Row["transactionType"], amount: number): Row => ({
    id: BigInt(id),
    politicalOrganizationId: BigInt(1),
    transactionType,
    debitAmount: amount,
    creditAmount: amount,
  });
  // 収入 3件（10万・5万・1千）と支出 3件（8万・2万・500）
  const rows: Row[] = [
    row(1, "income", 1_000),
    row(2, "expense", 80_000),
    row(3, "income", 100_000),
    row(4, "expense", 500),
    row(5, "income", 50_000),
    row(6, "expense", 20_000),
  ];

  /** where の transactionType で絞り、orderBy の先頭のキーで並べてから skip / take する簡易モック */
  const createPrismaMock = () => {
    const ofType = (where: FindManyArgs["where"]) =>
      where.AND ? rows.filter((r) => r.transactionType === where.AND?.[1].transactionType) : rows;
    const findMany = jest.fn(async ({ where, orderBy, skip, take }: FindManyArgs) => {
      const [[key, direction]] = Object.entries(orderBy[0]) as [[keyof Row, "asc" | "desc"]];
      const sorted = [...ofType(where)].sort((a, b) =>
        direction === "asc" ? Number(a[key]) - Number(b[key]) : Number(b[key]) - Number(a[key]),
      );
      return sorted.slice(skip, skip + take);
    });
    const count = jest.fn(async ({ where }: { where: FindManyArgs["where"] }) => ofType(where).length);
    return {
      prisma: { transaction: { findMany, count } } as unknown as PrismaClient,
      findMany,
    };
  };

  const idsOf = (items: { id: string }[]) => items.map((item) => item.id);

  it("降順（収入が多い順）は収入の大きい順のあとに支出の小さい順を並べる", async () => {
    const { prisma } = createPrismaMock();
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.findWithPagination(
      {},
      { page: 1, perPage: 10, sortBy: "signedAmount", order: "desc" },
    );

    expect(idsOf(result.items)).toEqual(["3", "5", "1", "4", "6", "2"]);
    expect(result.total).toBe(6);
  });

  it("昇順（支出が多い順）は支出の大きい順のあとに収入の小さい順を並べる", async () => {
    const { prisma } = createPrismaMock();
    const repository = new PrismaTransactionRepository(prisma);

    const result = await repository.findWithPagination(
      {},
      { page: 1, perPage: 10, sortBy: "signedAmount", order: "asc" },
    );

    expect(idsOf(result.items)).toEqual(["2", "6", "4", "1", "5", "3"]);
  });

  it("ページが支出と収入の境目にかかっても、続きの行を取りこぼさない", async () => {
    const { prisma, findMany } = createPrismaMock();
    const repository = new PrismaTransactionRepository(prisma);
    const page = (n: number) =>
      repository.findWithPagination({}, { page: n, perPage: 4, sortBy: "signedAmount", order: "asc" });

    expect(idsOf((await page(1)).items)).toEqual(["2", "6", "4", "1"]);
    expect(idsOf((await page(2)).items)).toEqual(["5", "3"]);

    // 2ページ目は収入だけで足りるので、支出は取りにいかない
    const lastCalls = findMany.mock.calls.slice(-1);
    expect(lastCalls[0][0].where.AND?.[1].transactionType).toBe("income");
  });
});
