import {
  buildCoverageLabel,
  buildGrantPeriodLabel,
} from "@/server/contexts/research-fund/domain/services/research-fund-coverage";

describe("buildCoverageLabel", () => {
  it("同じ年の範囲は「2026年2-8月」の形にする", () => {
    expect(
      buildCoverageLabel([{ months: ["2026-02", "2026-04"], publishedThrough: "2026-08" }]),
    ).toBe("2026年2-8月分を公開中");
  });

  it("1か月だけなら範囲にしない", () => {
    expect(buildCoverageLabel([{ months: ["2026-02"], publishedThrough: "2026-02" }])).toBe(
      "2026年2月分を公開中",
    );
  });

  it("年をまたぐ範囲では終端の年も出す", () => {
    expect(
      buildCoverageLabel([{ months: ["2025-11"], publishedThrough: "2026-01" }]),
    ).toBe("2025年11月-2026年1月分を公開中");
  });

  it("複数の議員の範囲をまとめる", () => {
    expect(
      buildCoverageLabel([
        { months: ["2026-04"], publishedThrough: "2026-05" },
        { months: ["2026-02"], publishedThrough: "2026-08" },
      ]),
    ).toBe("2026年2-8月分を公開中");
  });

  it("公開範囲が未設定でも実データの月から範囲を作る", () => {
    expect(buildCoverageLabel([{ months: ["2026-03", "2026-06"], publishedThrough: null }])).toBe(
      "2026年3-6月分を公開中",
    );
  });

  it("公開されている月が無ければ未公開（準備中の議員とは別の言葉）", () => {
    expect(buildCoverageLabel([])).toBe("未公開");
    expect(buildCoverageLabel([{ months: [], publishedThrough: null }])).toBe("未公開");
  });
});

describe("buildGrantPeriodLabel", () => {
  it("公開範囲を「2026年2-8月分」の形で返す", () => {
    expect(buildGrantPeriodLabel({ months: ["2026-02", "2026-04"], publishedThrough: "2026-08" })).toBe(
      "2026年2-8月分",
    );
  });

  it("年をまたぐ範囲では終端の年も出す", () => {
    expect(buildGrantPeriodLabel({ months: ["2025-11"], publishedThrough: "2026-01" })).toBe(
      "2025年11月-2026年1月分",
    );
  });

  it("公開されている月が無ければ null", () => {
    expect(buildGrantPeriodLabel({ months: [], publishedThrough: null })).toBeNull();
  });
});
