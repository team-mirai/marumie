import {
  formatAmount,
  formatWarekiDate,
} from "@/server/contexts/report/domain/services/serializer-utils";

describe("formatAmount", () => {
  it("formats positive integers", () => {
    expect(formatAmount(1000)).toBe("1000");
    expect(formatAmount(123456789)).toBe("123456789");
  });

  it("rounds decimal values", () => {
    expect(formatAmount(1000.4)).toBe("1000");
    expect(formatAmount(1000.5)).toBe("1001");
    expect(formatAmount(1000.9)).toBe("1001");
  });

  it("returns '0' for null/undefined", () => {
    expect(formatAmount(null)).toBe("0");
    expect(formatAmount(undefined)).toBe("0");
  });

  it("returns '0' for non-finite values", () => {
    expect(formatAmount(Number.NaN)).toBe("0");
    expect(formatAmount(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatAmount(Number.NEGATIVE_INFINITY)).toBe("0");
  });

  it("handles zero", () => {
    expect(formatAmount(0)).toBe("0");
  });
});

describe("formatWarekiDate", () => {
  describe("令和 (Reiwa)", () => {
    it("formats dates in Reiwa era (2019-05-01 onwards)", () => {
      expect(formatWarekiDate(new Date(2019, 4, 1))).toBe("R1/5/1");
      expect(formatWarekiDate(new Date(2025, 0, 15))).toBe("R7/1/15");
      expect(formatWarekiDate(new Date(2025, 11, 31))).toBe("R7/12/31");
    });
  });

  describe("平成 (Heisei)", () => {
    it("formats dates in Heisei era (1989-01-08 to 2019-04-30)", () => {
      expect(formatWarekiDate(new Date(1989, 0, 8))).toBe("H1/1/8");
      expect(formatWarekiDate(new Date(2019, 3, 30))).toBe("H31/4/30");
      expect(formatWarekiDate(new Date(2000, 5, 15))).toBe("H12/6/15");
    });
  });

  describe("昭和 (Showa)", () => {
    it("formats dates in Showa era (1926-12-25 to 1989-01-07)", () => {
      expect(formatWarekiDate(new Date(1926, 11, 25))).toBe("S1/12/25");
      expect(formatWarekiDate(new Date(1989, 0, 7))).toBe("S64/1/7");
      expect(formatWarekiDate(new Date(1975, 3, 10))).toBe("S50/4/10");
    });
  });

  describe("Pre-Showa dates (error)", () => {
    it("throws error for dates before Showa era", () => {
      expect(() => formatWarekiDate(new Date(1925, 5, 15))).toThrow(
        "Unsupported date"
      );
      expect(() => formatWarekiDate(new Date(1900, 0, 1))).toThrow(
        "Unsupported date"
      );
    });

    it("throws error for 1926-12-24 (day before Showa)", () => {
      expect(() => formatWarekiDate(new Date(1926, 11, 24))).toThrow(
        "Unsupported date"
      );
    });
  });

  describe("Edge cases", () => {
    it("returns empty string for null/undefined", () => {
      expect(formatWarekiDate(null)).toBe("");
      expect(formatWarekiDate(undefined)).toBe("");
    });

    it("returns empty string for invalid Date", () => {
      expect(formatWarekiDate(new Date("invalid"))).toBe("");
    });

    it("returns empty string for non-Date values", () => {
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      expect(formatWarekiDate("2025-01-01" as any)).toBe("");
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      expect(formatWarekiDate(12345 as any)).toBe("");
    });
  });
});
