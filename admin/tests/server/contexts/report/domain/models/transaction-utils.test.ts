import {
  resolveIncomeAmount,
  resolveExpenseAmount,
  sanitizeText,
  buildBikou,
  isAboveThreshold,
  TEN_MAN_THRESHOLD,
} from "@/server/contexts/report/domain/models/transaction-utils";

describe("resolveIncomeAmount", () => {
  it("returns creditAmount when it is positive", () => {
    expect(resolveIncomeAmount(50000, 100000)).toBe(100000);
  });

  it("returns debitAmount when creditAmount is zero", () => {
    expect(resolveIncomeAmount(75000, 0)).toBe(75000);
  });

  it("returns debitAmount when creditAmount is negative", () => {
    expect(resolveIncomeAmount(50000, -100)).toBe(50000);
  });

  it("returns 0 when both amounts are zero", () => {
    expect(resolveIncomeAmount(0, 0)).toBe(0);
  });

  it("returns 0 when debitAmount is NaN and creditAmount is zero", () => {
    expect(resolveIncomeAmount(NaN, 0)).toBe(0);
  });

  it("returns debitAmount when creditAmount is NaN", () => {
    expect(resolveIncomeAmount(50000, NaN)).toBe(50000);
  });
});

describe("resolveExpenseAmount", () => {
  it("returns debitAmount when it is positive", () => {
    expect(resolveExpenseAmount(100000, 50000)).toBe(100000);
  });

  it("returns creditAmount when debitAmount is zero", () => {
    expect(resolveExpenseAmount(0, 75000)).toBe(75000);
  });

  it("returns creditAmount when debitAmount is negative", () => {
    expect(resolveExpenseAmount(-100, 50000)).toBe(50000);
  });

  it("returns 0 when both amounts are zero", () => {
    expect(resolveExpenseAmount(0, 0)).toBe(0);
  });

  it("returns 0 when creditAmount is NaN and debitAmount is zero", () => {
    expect(resolveExpenseAmount(0, NaN)).toBe(0);
  });

  it("returns creditAmount when debitAmount is NaN", () => {
    expect(resolveExpenseAmount(NaN, 50000)).toBe(50000);
  });
});

describe("sanitizeText", () => {
  it("returns empty string for null", () => {
    expect(sanitizeText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizeText(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeText("  hello world  ")).toBe("hello world");
  });

  it("normalizes multiple spaces to single space", () => {
    expect(sanitizeText("hello    world")).toBe("hello world");
  });

  it("normalizes various whitespace characters", () => {
    expect(sanitizeText("hello\t\nworld")).toBe("hello world");
  });

  it("truncates text exceeding maxLength", () => {
    expect(sanitizeText("hello world", 5)).toBe("hello");
  });

  it("does not truncate text within maxLength", () => {
    expect(sanitizeText("hello", 10)).toBe("hello");
  });

  it("handles Japanese text correctly", () => {
    expect(sanitizeText("  東京都　渋谷区  ")).toBe("東京都 渋谷区");
  });
});

describe("isAboveThreshold", () => {
  it("returns true when amount is above threshold", () => {
    expect(isAboveThreshold(150000, TEN_MAN_THRESHOLD)).toBe(true);
  });

  it("returns true when amount equals threshold", () => {
    expect(isAboveThreshold(100000, TEN_MAN_THRESHOLD)).toBe(true);
  });

  it("returns false when amount is below threshold", () => {
    expect(isAboveThreshold(99999, TEN_MAN_THRESHOLD)).toBe(false);
  });

  it("uses TEN_MAN_THRESHOLD as default", () => {
    expect(isAboveThreshold(100000)).toBe(true);
    expect(isAboveThreshold(99999)).toBe(false);
  });
});

describe("TEN_MAN_THRESHOLD", () => {
  it("equals 100,000", () => {
    expect(TEN_MAN_THRESHOLD).toBe(100_000);
  });
});

describe("buildBikou", () => {
  it("builds bikou with transactionNo only when memo is null", () => {
    const result = buildBikou("123", null);
    expect(result).toBe("MF行番号: 123");
  });

  it("builds bikou with transactionNo only when memo is undefined", () => {
    const result = buildBikou("456", undefined);
    expect(result).toBe("MF行番号: 456");
  });

  it("builds bikou with transactionNo only when memo is empty", () => {
    const result = buildBikou("789", "");
    expect(result).toBe("MF行番号: 789");
  });

  it("combines memo and transactionNo", () => {
    const result = buildBikou("100", "テストメモ");
    expect(result).toBe("テストメモ / MF行番号: 100");
  });

  it("truncates memo based on memoMaxLength", () => {
    const longMemo = "あ".repeat(200);
    const result = buildBikou("1", longMemo, 10, 500);
    expect(result).toContain("あ".repeat(10));
    expect(result).toContain("MF行番号: 1");
  });

  it("truncates final result based on totalMaxLength", () => {
    const memo = "テストメモ";
    const result = buildBikou("12345", memo, 160, 20);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("handles missing transactionNo gracefully", () => {
    const result = buildBikou("", "メモ");
    expect(result).toBe("メモ / MF行番号: -");
  });

  it("normalizes whitespace in memo", () => {
    const result = buildBikou("1", "  複数の   空白  ");
    expect(result).toBe("複数の 空白 / MF行番号: 1");
  });
});
