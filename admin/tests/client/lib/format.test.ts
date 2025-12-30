import {
  formatDate,
  formatAmount,
  formatCurrency,
} from "@/client/lib/format";

describe("formatDate", () => {
  it("formats date to YYYY/MM/DD format with zero-padding", () => {
    expect(formatDate(new Date(2025, 0, 1))).toBe("2025/01/01");
    expect(formatDate(new Date(2025, 11, 31))).toBe("2025/12/31");
  });

  it("pads single-digit months with zero", () => {
    expect(formatDate(new Date(2025, 0, 15))).toBe("2025/01/15");
    expect(formatDate(new Date(2025, 8, 5))).toBe("2025/09/05");
  });

  it("pads single-digit days with zero", () => {
    expect(formatDate(new Date(2025, 5, 1))).toBe("2025/06/01");
    expect(formatDate(new Date(2025, 10, 9))).toBe("2025/11/09");
  });

  it("handles various years", () => {
    expect(formatDate(new Date(2000, 0, 1))).toBe("2000/01/01");
    expect(formatDate(new Date(1999, 11, 31))).toBe("1999/12/31");
    expect(formatDate(new Date(2030, 6, 15))).toBe("2030/07/15");
  });

  it("handles date strings passed as Date objects", () => {
    const dateFromString = new Date("2025-06-15T00:00:00");
    expect(formatDate(dateFromString)).toBe("2025/06/15");
  });

  it("handles leap year dates", () => {
    expect(formatDate(new Date(2024, 1, 29))).toBe("2024/02/29");
  });
});

describe("formatAmount", () => {
  it("formats positive integers with yen symbol and comma separators", () => {
    expect(formatAmount(1000)).toBe("¥1,000");
    expect(formatAmount(1234567)).toBe("¥1,234,567");
  });

  it("formats zero", () => {
    expect(formatAmount(0)).toBe("¥0");
  });

  it("formats small amounts without comma", () => {
    expect(formatAmount(1)).toBe("¥1");
    expect(formatAmount(100)).toBe("¥100");
    expect(formatAmount(999)).toBe("¥999");
  });

  it("formats large amounts with multiple commas", () => {
    expect(formatAmount(1000000)).toBe("¥1,000,000");
    expect(formatAmount(123456789)).toBe("¥123,456,789");
  });

  it("handles decimal values", () => {
    // toLocaleString may include decimals depending on locale
    const result = formatAmount(1234.56);
    expect(result).toMatch(/^¥1,234/);
  });

  it("handles negative amounts", () => {
    const result = formatAmount(-1000);
    expect(result).toContain("1,000");
  });
});

describe("formatCurrency", () => {
  it("formats positive integers with yen symbol and comma separators (ja-JP locale)", () => {
    expect(formatCurrency(1000)).toBe("¥1,000");
    expect(formatCurrency(1234567)).toBe("¥1,234,567");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("¥0");
  });

  it("formats small amounts without comma", () => {
    expect(formatCurrency(1)).toBe("¥1");
    expect(formatCurrency(100)).toBe("¥100");
    expect(formatCurrency(999)).toBe("¥999");
  });

  it("formats large amounts with multiple commas", () => {
    expect(formatCurrency(1000000)).toBe("¥1,000,000");
    expect(formatCurrency(123456789)).toBe("¥123,456,789");
  });

  it("handles decimal values", () => {
    // ja-JP locale typically rounds to integer for currency
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/^¥1,234/);
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-1000);
    expect(result).toContain("1,000");
  });

  it("produces consistent output regardless of system locale", () => {
    // formatCurrency explicitly uses ja-JP locale for consistency
    expect(formatCurrency(12345)).toBe("¥12,345");
  });
});

describe("formatAmount vs formatCurrency", () => {
  it("both format basic amounts the same way", () => {
    // For basic integer amounts, both should produce similar results
    expect(formatAmount(1000)).toBe(formatCurrency(1000));
    expect(formatAmount(0)).toBe(formatCurrency(0));
  });
});
