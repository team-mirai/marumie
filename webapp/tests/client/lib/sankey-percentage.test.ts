import { formatSankeyPercentage } from "@/client/lib/sankey-percentage";

describe("formatSankeyPercentage", () => {
  it("合計に対する割合を整数%で返す", () => {
    expect(formatSankeyPercentage(316_000, 1_000_000)).toBe("32%");
    expect(formatSankeyPercentage(1_000_000, 1_000_000)).toBe("100%");
  });

  it("ちょうど1%は「1%」", () => {
    expect(formatSankeyPercentage(10_000, 1_000_000)).toBe("1%");
  });

  it("1%未満は「<1%」", () => {
    expect(formatSankeyPercentage(9_999, 1_000_000)).toBe("<1%");
  });

  it("値か合計が無ければ空文字", () => {
    expect(formatSankeyPercentage(0, 1_000_000)).toBe("");
    expect(formatSankeyPercentage(100, 0)).toBe("");
    expect(formatSankeyPercentage(undefined, 1_000_000)).toBe("");
  });
});
