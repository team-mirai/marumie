import type { PrismaClient } from "@prisma/client";
import { PrismaBalanceSheetRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-balance-sheet.repository";

type AccountFilter = string | { in: string[] };
type YearFilter = number | { lte: number };

type AggregateArgs = {
  _sum: { debitAmount?: boolean; creditAmount?: boolean };
  where: {
    debitAccount?: AccountFilter;
    creditAccount?: AccountFilter;
    financialYear?: YearFilter;
    transactionType?: string;
  };
};

type FakeTransaction = {
  financialYear: number;
  transactionType: "income" | "expense";
  debitAccount: string;
  debitAmount: number;
  creditAccount: string;
  creditAmount: number;
};

const matchesAccount = (filter: AccountFilter | undefined, account: string) =>
  filter === undefined ||
  (typeof filter === "string" ? filter === account : filter.in.includes(account));

const matchesYear = (filter: YearFilter | undefined, year: number) =>
  filter === undefined || (typeof filter === "number" ? filter === year : year <= filter.lte);

/**
 * aggregate の where を取引行に当てはめて合計を返す簡易フェイク
 */
const createPrismaMock = (transactions: FakeTransaction[]) => {
  const aggregate = jest.fn(async (args: AggregateArgs) => {
    const rows = transactions.filter(
      (tx) =>
        matchesAccount(args.where.debitAccount, tx.debitAccount) &&
        matchesAccount(args.where.creditAccount, tx.creditAccount) &&
        matchesYear(args.where.financialYear, tx.financialYear) &&
        (args.where.transactionType === undefined ||
          args.where.transactionType === tx.transactionType),
    );
    if (args._sum.debitAmount) {
      return { _sum: { debitAmount: rows.reduce((sum, tx) => sum + tx.debitAmount, 0) } };
    }
    return { _sum: { creditAmount: rows.reduce((sum, tx) => sum + tx.creditAmount, 0) } };
  });

  const queryRaw = jest.fn(async (..._args: unknown[]) => [{ total_balance: "0" }]);

  return {
    prisma: { transaction: { aggregate }, $queryRaw: queryRaw } as unknown as PrismaClient,
    aggregate,
    queryRaw,
  };
};

const tx = (
  financialYear: number,
  debitAccount: string,
  creditAccount: string,
  amount: number,
  transactionType: "income" | "expense" = "expense",
): FakeTransaction => ({
  financialYear,
  transactionType,
  debitAccount,
  debitAmount: amount,
  creditAccount,
  creditAmount: amount,
});

describe("PrismaBalanceSheetRepository", () => {
  describe("getCurrentLiabilities（サンキー用・年度内の増減）", () => {
    it("未払金・未払費用・仮受金の指定年度内の貸方 - 借方を返す", async () => {
      const { prisma, aggregate } = createPrismaMock([
        tx(2026, "未払費用", "普通預金", 100_000),
        tx(2026, "未収入金", "寄附", 999_999),
        tx(2026, "事務所費", "未払金", 300_000),
        tx(2026, "事務所費", "未払費用", 500_000),
        tx(2026, "普通預金", "仮受金", 50_000),
        // 前年度の未払金は年度内の増減に含めない
        tx(2025, "事務所費", "未払金", 700_000),
      ]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getCurrentLiabilities(["1"], 2026);

      expect(result).toBe(750_000);
      for (const call of aggregate.mock.calls as Array<[AggregateArgs]>) {
        const filter = call[0].where.debitAccount ?? call[0].where.creditAccount;
        const accounts = typeof filter === "object" ? filter.in : [];
        expect(accounts).toEqual(expect.arrayContaining(["未払金", "未払費用", "仮受金"]));
        expect(accounts).not.toContain("未収入金");
        expect(accounts).not.toContain("未払金/未払費用");
        expect(call[0].where.financialYear).toBe(2026);
      }
    });
  });

  describe("getCurrentLiabilitiesBalance（貸借対照表用・年度末時点の残高）", () => {
    it("前年度以前から繰り越した未払金を含め、翌年度の取引は含めない", async () => {
      const { prisma } = createPrismaMock([
        tx(2024, "事務所費", "未払金", 200_000),
        tx(2025, "事務所費", "未払費用", 300_000),
        tx(2025, "未払金", "普通預金", 50_000),
        tx(2026, "事務所費", "未払金", 999_999),
        tx(2026, "未払費用", "普通預金", 300_000),
      ]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getCurrentLiabilitiesBalance(["1"], 2025);

      expect(result).toBe(450_000);
    });
  });

  describe("getReceivables", () => {
    it("未収入金の借方 - 貸方を債権残高として返す", async () => {
      const { prisma, aggregate } = createPrismaMock([
        tx(2026, "未収入金", "寄附", 400_000),
        tx(2026, "未払費用", "普通預金", 999_999),
        tx(2026, "普通預金", "未収入金", 150_000),
        tx(2026, "事務所費", "未払金", 999_999),
      ]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getReceivables(["1"], 2026);

      expect(result).toBe(250_000);
      for (const call of aggregate.mock.calls as Array<[AggregateArgs]>) {
        const filter = call[0].where.debitAccount ?? call[0].where.creditAccount;
        expect(typeof filter === "object" ? filter.in : []).toEqual(["未収入金"]);
      }
    });

    it("前年度以前から繰り越した未収入金を含め、翌年度の取引は含めない", async () => {
      const { prisma } = createPrismaMock([
        tx(2024, "未収入金", "寄附", 100_000),
        tx(2025, "未収入金", "寄附", 400_000),
        tx(2025, "普通預金", "未収入金", 150_000),
        tx(2026, "普通預金", "未収入金", 350_000),
        tx(2026, "未収入金", "寄附", 999_999),
      ]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getReceivables(["1"], 2025);

      expect(result).toBe(350_000);
    });

    it("対象取引がない場合は 0 を返す", async () => {
      const { prisma } = createPrismaMock([]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getReceivables(["1"], 2026);

      expect(result).toBe(0);
    });
  });

  describe("getBorrowingIncome / getBorrowingExpense", () => {
    it("指定年度末までの借入・返済だけを集計し、翌年度の取引は含めない", async () => {
      const { prisma } = createPrismaMock([
        tx(2024, "普通預金", "借入金", 1_000_000, "income"),
        tx(2025, "借入金", "普通預金", 300_000, "expense"),
        tx(2026, "普通預金", "借入金", 5_000_000, "income"),
        tx(2026, "借入金", "普通預金", 700_000, "expense"),
      ]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const [income, expense] = await Promise.all([
        repository.getBorrowingIncome(["1"], 2025),
        repository.getBorrowingExpense(["1"], 2025),
      ]);

      expect(income).toBe(1_000_000);
      expect(expense).toBe(300_000);
    });
  });

  describe("getCashBalance", () => {
    it("指定年度末より後の残高スナップショットを除外して最新残高を求める", async () => {
      const { prisma, queryRaw } = createPrismaMock([]);
      queryRaw.mockResolvedValueOnce([{ total_balance: "1234567" }]);
      const repository = new PrismaBalanceSheetRepository(prisma);

      const result = await repository.getCashBalance(["1"], 2025);

      expect(result).toBe(1_234_567);
      const [strings, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
      const sql = strings.join("?");
      expect(sql).toMatch(/EXTRACT\(YEAR FROM snapshot_date\) <= \?/);
      expect(sql).toMatch(/ORDER BY political_organization_id, snapshot_date DESC/);
      expect(values).toContain(2025);
    });
  });
});
