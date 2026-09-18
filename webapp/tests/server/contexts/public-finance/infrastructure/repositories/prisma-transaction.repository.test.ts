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
