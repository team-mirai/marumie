import { buildCoverageLabel } from "@/server/contexts/research-fund/domain/services/research-fund-coverage";

describe("buildCoverageLabel", () => {
  it("同じ年の範囲では終端の年を省く", () => {
    expect(
      buildCoverageLabel([{ months: ["2026-02", "2026-04"], publishedThrough: "2026-08" }]),
    ).toBe("2026年2月〜8月分を公開中");
  });

  it("1か月だけなら範囲にしない", () => {
    expect(buildCoverageLabel([{ months: ["2026-02"], publishedThrough: "2026-02" }])).toBe(
      "2026年2月分を公開中",
    );
  });

  it("年をまたぐ範囲では終端の年も出す", () => {
    expect(
      buildCoverageLabel([{ months: ["2025-11"], publishedThrough: "2026-01" }]),
    ).toBe("2025年11月〜2026年1月分を公開中");
  });

  it("複数の議員の範囲をまとめる", () => {
    expect(
      buildCoverageLabel([
        { months: ["2026-04"], publishedThrough: "2026-05" },
        { months: ["2026-02"], publishedThrough: "2026-08" },
      ]),
    ).toBe("2026年2月〜8月分を公開中");
  });

  it("公開範囲が未設定でも実データの月から範囲を作る", () => {
    expect(buildCoverageLabel([{ months: ["2026-03", "2026-06"], publishedThrough: null }])).toBe(
      "2026年3月〜6月分を公開中",
    );
  });

  it("公開されている月が無ければ準備中", () => {
    expect(buildCoverageLabel([])).toBe("準備中");
    expect(buildCoverageLabel([{ months: [], publishedThrough: null }])).toBe("準備中");
  });
});
