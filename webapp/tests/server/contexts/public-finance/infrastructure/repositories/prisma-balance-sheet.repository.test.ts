import type { PrismaClient } from "@prisma/client";
import { PrismaBalanceSheetRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-balance-sheet.repository";

type AggregateArgs = {
  _sum: { debitAmount?: boolean; creditAmount?: boolean };
  where: {
    debitAccount?: { in: string[] };
    creditAccount?: { in: string[] };
    financialYear?: number;
  };
};

/**
 * aggregate の呼び出しを借方 / 貸方で判別し、対象科目ごとの合計を返す簡易モック
 */
const createPrismaMock = (totals: {
  debit: Record<string, number>;
  credit: Record<string, number>;
}) => {
  const sumFor = (table: Record<string, number>, accounts: string[]) =>
    accounts.reduce((sum, account) => sum + (table[account] ?? 0), 0);

  const aggregate = jest.fn(async (args: AggregateArgs) => {
    if (args.where.debitAccount) {
      return { _sum: { debitAmount: sumFor(totals.debit, args.where.debitAccount.in) } };
    }
    if (args.where.creditAccount) {
      return { _sum: { creditAmount: sumFor(totals.credit, args.where.creditAccount.in) } };
    }
    throw new Error("unexpected aggregate call");
  });

  return {
    prisma: { transaction: { aggregate } } as unknown as PrismaClient,
    aggregate,
  };
};

describe("PrismaBalanceSheetRepository", () => {
  describe("getCurrentLiabilities", () => {
    it("未払金・未払費用・仮受金の貸方 - 借方を流動負債として返す", async () => {
      const { prisma, aggregate } = createPrismaMock({
        debit: { 未払費用: 100_000, 未収入金: 999_999 },
        credit: { 未払金: 300_000, 未払費用: 500_000, 仮受金: 50_000 },
      });
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getCurrentLiabilities(["1"], 2026);

      expect(result).toBe(750_000);
      for (const call of aggregate.mock.calls as Array<[AggregateArgs]>) {
        const accounts = call[0].where.debitAccount?.in ?? call[0].where.creditAccount?.in ?? [];
        expect(accounts).toEqual(expect.arrayContaining(["未払金", "未払費用", "仮受金"]));
        expect(accounts).not.toContain("未収入金");
        expect(accounts).not.toContain("未払金/未払費用");
        expect(call[0].where.financialYear).toBe(2026);
      }
    });
  });

  describe("getReceivables", () => {
    it("未収入金の借方 - 貸方を債権残高として返す", async () => {
      const { prisma, aggregate } = createPrismaMock({
        debit: { 未収入金: 400_000, 未払費用: 999_999 },
        credit: { 未収入金: 150_000, 未払金: 999_999 },
      });
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getReceivables(["1"], 2026);

      expect(result).toBe(250_000);
      for (const call of aggregate.mock.calls as Array<[AggregateArgs]>) {
        const accounts = call[0].where.debitAccount?.in ?? call[0].where.creditAccount?.in ?? [];
        expect(accounts).toEqual(["未収入金"]);
        expect(call[0].where.financialYear).toBe(2026);
      }
    });

    it("対象取引がない場合は 0 を返す", async () => {
      const { prisma } = createPrismaMock({ debit: {}, credit: {} });
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getReceivables(["1"], 2026);

      expect(result).toBe(0);
    });
  });
});
