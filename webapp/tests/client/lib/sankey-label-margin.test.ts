import { getSankeyHorizontalMargin } from "@/client/lib/sankey-label-margin";

describe("getSankeyHorizontalMargin", () => {
  it("デスクトップ（14.5px・ノードから16px）で1行7文字のラベルが収まる余白を返す", () => {
    const margin = getSankeyHorizontalMargin(16, 14.5, 7);

    expect(margin).toBeGreaterThanOrEqual(16 + 14.5 * 7);
    expect(margin).toBe(122);
  });

  it("SP（7px・ノードから4px）で1行7文字のラベルが収まる余白を返す", () => {
    const margin = getSankeyHorizontalMargin(4, 7, 7);

    expect(margin).toBeGreaterThanOrEqual(4 + 7 * 7);
    expect(margin).toBe(57);
  });

  it("SP で両端を小項目の文字サイズ（6px）にしたとき、1行7文字のラベルが収まる余白を返す", () => {
    const margin = getSankeyHorizontalMargin(4, 6, 7);

    expect(margin).toBeGreaterThanOrEqual(4 + 6 * 7);
    expect(margin).toBe(50);
  });
});
