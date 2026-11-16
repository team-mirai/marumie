import { formatYen } from "@/client/lib/format-yen";

describe("formatYen", () => {
  it("1万円未満は円で、4桁以上はカンマを付ける", () => {
    expect(formatYen(0)).toBe("0円");
    expect(formatYen(800)).toBe("800円");
    expect(formatYen(5_000)).toBe("5,000円");
  });

  it("1万円以上は万円に丸め、4桁以上はカンマを付ける", () => {
    expect(formatYen(10_000)).toBe("1万円");
    expect(formatYen(123_456)).toBe("12万円");
    expect(formatYen(15_370_000)).toBe("1,537万円");
  });

  it("1億円以上は億と万を並べ、ゼロ埋めしない", () => {
    expect(formatYen(100_000_000)).toBe("1億円");
    expect(formatYen(726_560_000)).toBe("7億2,656万円");
    expect(formatYen(104_100_000)).toBe("1億410万円");
  });

  it("負の値は先頭に - を付ける", () => {
    expect(formatYen(-1_000_000)).toBe("-100万円");
    expect(formatYen(-5_000)).toBe("-5,000円");
  });
});
