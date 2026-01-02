import {
  isValidYearMonthFormat,
  calculateBalance,
  aggregateFromTotals,
  type MonthlyAggregation,
} from "@/server/contexts/public-finance/domain/models/monthly-aggregation";
import type { MonthlyTransactionTotal } from "@/server/contexts/public-finance/domain/models/monthly-transaction-total";

describe("MonthlyAggregation domain model", () => {
  describe("isValidYearMonthFormat", () => {
    it("should return true for valid YYYY-MM format", () => {
      expect(isValidYearMonthFormat("2025-01")).toBe(true);
      expect(isValidYearMonthFormat("2025-12")).toBe(true);
      expect(isValidYearMonthFormat("2024-06")).toBe(true);
    });

    it("should return false for invalid month values", () => {
      expect(isValidYearMonthFormat("2025-00")).toBe(false);
      expect(isValidYearMonthFormat("2025-13")).toBe(false);
      expect(isValidYearMonthFormat("2025-99")).toBe(false);
    });

    it("should return false for invalid formats", () => {
      expect(isValidYearMonthFormat("2025/01")).toBe(false);
      expect(isValidYearMonthFormat("2025-1")).toBe(false);
      expect(isValidYearMonthFormat("25-01")).toBe(false);
      expect(isValidYearMonthFormat("2025-01-01")).toBe(false);
      expect(isValidYearMonthFormat("")).toBe(false);
      expect(isValidYearMonthFormat("invalid")).toBe(false);
    });
  });

  describe("calculateBalance", () => {
    it("should calculate positive balance when income exceeds expense", () => {
      const aggregation: MonthlyAggregation = {
        yearMonth: "2025-01",
        income: 1000000,
        expense: 500000,
      };
      expect(calculateBalance(aggregation)).toBe(500000);
    });

    it("should calculate negative balance when expense exceeds income", () => {
      const aggregation: MonthlyAggregation = {
        yearMonth: "2025-01",
        income: 500000,
        expense: 800000,
      };
      expect(calculateBalance(aggregation)).toBe(-300000);
    });

    it("should return zero when income equals expense", () => {
      const aggregation: MonthlyAggregation = {
        yearMonth: "2025-01",
        income: 500000,
        expense: 500000,
      };
      expect(calculateBalance(aggregation)).toBe(0);
    });

    it("should handle zero values", () => {
      const aggregation: MonthlyAggregation = {
        yearMonth: "2025-01",
        income: 0,
        expense: 0,
      };
      expect(calculateBalance(aggregation)).toBe(0);
    });
  });

  describe("aggregateFromTotals", () => {
    it("should return all 12 months for the financial year", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 1000000 },
        { year: 2025, month: 2, totalAmount: 800000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 500000 },
        { year: 2025, month: 2, totalAmount: 600000 },
      ];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      // 全12ヶ月分が返される
      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({
        yearMonth: "2025-01",
        income: 1000000,
        expense: 500000,
      });
      expect(result[1]).toEqual({
        yearMonth: "2025-02",
        income: 800000,
        expense: 600000,
      });
      // データがない月は収支0
      expect(result[2]).toEqual({
        yearMonth: "2025-03",
        income: 0,
        expense: 0,
      });
    });

    it("should fill missing months with zero income and expense", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 1000000 },
        { year: 2025, month: 3, totalAmount: 500000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 300000 },
      ];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({
        yearMonth: "2025-01",
        income: 1000000,
        expense: 300000,
      });
      // 2月はデータがないので収支0
      expect(result[1]).toEqual({
        yearMonth: "2025-02",
        income: 0,
        expense: 0,
      });
      expect(result[2]).toEqual({
        yearMonth: "2025-03",
        income: 500000,
        expense: 0,
      });
    });

    it("should handle months with only expense data", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 1000000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 300000 },
        { year: 2025, month: 2, totalAmount: 200000 },
      ];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({
        yearMonth: "2025-01",
        income: 1000000,
        expense: 300000,
      });
      expect(result[1]).toEqual({
        yearMonth: "2025-02",
        income: 0,
        expense: 200000,
      });
    });

    it("should sort results by yearMonth", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 3, totalAmount: 300000 },
        { year: 2025, month: 1, totalAmount: 100000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 2, totalAmount: 200000 },
      ];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      expect(result).toHaveLength(12);
      expect(result[0].yearMonth).toBe("2025-01");
      expect(result[1].yearMonth).toBe("2025-02");
      expect(result[2].yearMonth).toBe("2025-03");
      expect(result[11].yearMonth).toBe("2025-12");
    });

    it("should format yearMonth with zero-padded month", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2025, month: 1, totalAmount: 100000 },
        { year: 2025, month: 12, totalAmount: 1200000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      expect(result[0].yearMonth).toBe("2025-01");
      expect(result[11].yearMonth).toBe("2025-12");
    });

    it("should return 12 months with zero values when no data exists", () => {
      const result = aggregateFromTotals([], [], 2025);
      expect(result).toHaveLength(12);
      // 全ての月が収支0
      for (const item of result) {
        expect(item.income).toBe(0);
        expect(item.expense).toBe(0);
      }
      expect(result[0].yearMonth).toBe("2025-01");
      expect(result[11].yearMonth).toBe("2025-12");
    });

    it("should only include data for the specified financial year", () => {
      const incomeData: MonthlyTransactionTotal[] = [
        { year: 2024, month: 12, totalAmount: 500000 },
        { year: 2025, month: 1, totalAmount: 600000 },
      ];
      const expenseData: MonthlyTransactionTotal[] = [
        { year: 2024, month: 12, totalAmount: 200000 },
        { year: 2025, month: 1, totalAmount: 300000 },
      ];

      const result = aggregateFromTotals(incomeData, expenseData, 2025);

      // 2025年の12ヶ月分のみ返される
      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({
        yearMonth: "2025-01",
        income: 600000,
        expense: 300000,
      });
      // 2024年12月のデータは含まれない（2025年の会計年度外）
      expect(result.find((r) => r.yearMonth === "2024-12")).toBeUndefined();
    });
  });
});
