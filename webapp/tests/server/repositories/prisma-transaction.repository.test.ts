// Mock the category-mapping module
jest.mock("@/shared/accounting/account-category", () => ({
  BS_CATEGORIES: {
    未払費用: { type: "liability", category: "負債" },
    借入金: { type: "liability", category: "負債" },
    現金: { type: "asset", category: "資産" },
  },
}));

import { PrismaTransactionRepository } from "../../../src/server/repositories/prisma-transaction.repository";

// Prisma クライアントのモック
const mockPrisma = {
  transaction: {
    aggregate: jest.fn(),
  },
};

describe("PrismaTransactionRepository", () => {
  let repository: PrismaTransactionRepository;

  beforeEach(() => {
    repository = new PrismaTransactionRepository(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe("getLiabilityBalance", () => {
    const testPoliticalOrganizationIds = ["1", "2"];
    const testFinancialYear = 2024;

    it("should calculate liability balance correctly", async () => {
      // 借方（負債の減少）: 50000
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { debitAmount: BigInt(50000) },
        })
        // 貸方（負債の増加）: 100000
        .mockResolvedValueOnce({
          _sum: { creditAmount: BigInt(100000) },
        });

      const result = await repository.getLiabilityBalance(
        testPoliticalOrganizationIds,
        testFinancialYear
      );

      // 負債残高 = 貸方 - 借方 = 100000 - 50000 = 50000
      expect(result).toEqual(50000);

      // 2回呼び出される（借方用と貸方用）
      expect(mockPrisma.transaction.aggregate).toHaveBeenCalledTimes(2);

      // 借方集計のクエリを検証
      expect(mockPrisma.transaction.aggregate).toHaveBeenNthCalledWith(1, {
        _sum: { debitAmount: true },
        where: {
          politicalOrganizationId: {
            in: [BigInt("1"), BigInt("2")],
          },
          financialYear: testFinancialYear,
          debitAccount: {
            in: ["未払費用", "借入金"],
          },
        },
      });

      // 貸方集計のクエリを検証
      expect(mockPrisma.transaction.aggregate).toHaveBeenNthCalledWith(2, {
        _sum: { creditAmount: true },
        where: {
          politicalOrganizationId: {
            in: [BigInt("1"), BigInt("2")],
          },
          financialYear: testFinancialYear,
          creditAccount: {
            in: ["未払費用", "借入金"],
          },
        },
      });
    });

    it("should handle null values in aggregate results", async () => {
      // null値のケース
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { debitAmount: null },
        })
        .mockResolvedValueOnce({
          _sum: { creditAmount: null },
        });

      const result = await repository.getLiabilityBalance(
        testPoliticalOrganizationIds,
        testFinancialYear
      );

      expect(result).toEqual(0);
    });

    it("should handle negative liability balance", async () => {
      // 借方が貸方より大きい場合（負債がマイナス）
      mockPrisma.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { debitAmount: BigInt(100000) },
        })
        .mockResolvedValueOnce({
          _sum: { creditAmount: BigInt(50000) },
        });

      const result = await repository.getLiabilityBalance(
        testPoliticalOrganizationIds,
        testFinancialYear
      );

      // 負債残高 = 貸方 - 借方 = 50000 - 100000 = -50000
      expect(result).toEqual(-50000);
    });

  });
});
