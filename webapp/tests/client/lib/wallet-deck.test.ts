import {
  anchoredSheetMarginTop,
  collapsedSheetMarginBottom,
  toggleOpen,
} from "@/client/lib/wallet-deck";

describe("toggleOpen", () => {
  it("閉じているカードを押すと、ほかに開いているカードはそのままで開く", () => {
    expect(toggleOpen(["taro"], "hanako")).toEqual(["taro", "hanako"]);
  });

  it("開いているカードを押すと、そのカードだけ閉じる", () => {
    expect(toggleOpen(["taro", "hanako", "jiro"], "hanako")).toEqual(["taro", "jiro"]);
  });

  it("全部閉じた状態からも開ける", () => {
    expect(toggleOpen([], "taro")).toEqual(["taro"]);
  });

  it("元の配列は変えない", () => {
    const open = ["taro"];
    toggleOpen(open, "hanako");
    expect(open).toEqual(["taro"]);
  });
});

describe("anchoredSheetMarginTop", () => {
  it("カードが低くなるぶん上の余白を増やし、シートの上端をカードの上端から同じ位置に留める", () => {
    // 開いたカード 180px・余白 -162px のシートを、畳んだカード 92px のときに同じ位置へ
    expect(anchoredSheetMarginTop(-162, 180, 92)).toBe(-74);
  });

  it("カードの高さが変わらなければ余白もそのまま", () => {
    expect(anchoredSheetMarginTop(-162, 180, 180)).toBe(-162);
  });
});

describe("collapsedSheetMarginBottom", () => {
  it("上の余白・最小の高さ・下の余白の合計が 0 になり、後ろのカードを押し下げない", () => {
    const marginTop = -74;
    const minHeight = 208;
    expect(marginTop + minHeight + collapsedSheetMarginBottom(marginTop, minHeight)).toBe(0);
  });
});
