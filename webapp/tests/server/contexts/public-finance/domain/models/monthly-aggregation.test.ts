import {
  isValidYearMonthFormat,
  calculateBalance,
  type MonthlyAggregation,
} from "@/server/contexts/public-finance/domain/models/monthly-aggregation";

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
});
