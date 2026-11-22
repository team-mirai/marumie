import {
  EXPENSE_DETAIL_THRESHOLD,
  EXPENSE_DETAIL_THRESHOLD_LABEL,
  getExpenseDetailRawAmountConditions,
  isExpenseDetailRequired,
  resolveExpenseDetailAmount,
} from "@/server/contexts/report/domain/models/expense-detail-threshold";

describe("expense-detail-threshold", () => {
  describe("EXPENSE_DETAIL_THRESHOLD", () => {
    it("明細記載の基準は5万円である", () => {
      expect(EXPENSE_DETAIL_THRESHOLD).toBe(50_000);
    });
  });

  describe("EXPENSE_DETAIL_THRESHOLD_LABEL", () => {
    it("基準額を万円単位の文言にする", () => {
      expect(EXPENSE_DETAIL_THRESHOLD_LABEL).toBe("5万円");
    });
  });

  describe("resolveExpenseDetailAmount", () => {
    it("借方金額が正なら借方金額を使う", () => {
      expect(resolveExpenseDetailAmount(60_000, 10_000)).toBe(60_000);
    });

    it("借方金額が 0 以下なら貸方金額を使う", () => {
      expect(resolveExpenseDetailAmount(0, 70_000)).toBe(70_000);
    });

    it("円未満を四捨五入する", () => {
      expect(resolveExpenseDetailAmount(49_999.5, 0)).toBe(50_000);
      expect(resolveExpenseDetailAmount(49_999.49, 0)).toBe(49_999);
    });
  });

  describe("isExpenseDetailRequired", () => {
    it("基準以上なら true", () => {
      expect(isExpenseDetailRequired(50_000, 0)).toBe(true);
      expect(isExpenseDetailRequired(150_000, 150_000)).toBe(true);
      expect(isExpenseDetailRequired(0, 50_000)).toBe(true);
    });

    it("基準未満なら false", () => {
      expect(isExpenseDetailRequired(49_999, 49_999)).toBe(false);
      expect(isExpenseDetailRequired(0, 0)).toBe(false);
      expect(isExpenseDetailRequired(40_000, 60_000)).toBe(false);
    });
  });

  describe("getExpenseDetailRawAmountConditions", () => {
    const matches = (debitAmount: number, creditAmount: number) =>
      getExpenseDetailRawAmountConditions().some((condition) =>
        "gte" in condition.debitAmount
          ? debitAmount >= condition.debitAmount.gte
          : "creditAmount" in condition &&
            debitAmount <= condition.debitAmount.lte &&
            creditAmount >= condition.creditAmount.gte,
      );

    const amounts = [-1, 0, 0.4, 1, 49_999, 49_999.49, 49_999.5, 50_000, 50_000.4, 150_000];

    it("条件に当たる金額と isExpenseDetailRequired が true の金額が一致する", () => {
      for (const debitAmount of amounts) {
        for (const creditAmount of amounts) {
          expect({ debitAmount, creditAmount, matched: matches(debitAmount, creditAmount) }).toEqual({
            debitAmount,
            creditAmount,
            matched: isExpenseDetailRequired(debitAmount, creditAmount),
          });
        }
      }
    });
  });
});
