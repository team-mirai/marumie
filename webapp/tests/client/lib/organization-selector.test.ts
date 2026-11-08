import {
  formatResearchFundSelectorLabel,
  politicianYearHref,
} from "@/client/lib/organization-selector";

describe("formatResearchFundSelectorLabel", () => {
  it("調研費ページの表示名は「{氏名}（調研費）」", () => {
    expect(formatResearchFundSelectorLabel("峰島侑也")).toBe("峰島侑也（調研費）");
  });
});

describe("politicianYearHref", () => {
  const token = "0123456789abcdef0123456789abcdef";

  it("その年度に公開済みの仕訳がある議員なら、その年度の議員ページへ送る", () => {
    expect(politicianYearHref("sample-taro", 2025, ["sample-taro"])).toBe("/p/sample-taro/2025");
  });

  it("その年度に公開済みの仕訳が無い議員なら null（政治団体ページに戻す）", () => {
    expect(politicianYearHref("sample-taro", 2025, [])).toBeNull();
  });

  it("議員ページでなければ null", () => {
    expect(politicianYearHref("", 2025, ["sample-taro"])).toBeNull();
  });

  it("プレビュー URL なら、プレビュー用の文字列を保ったまま年度だけを替える", () => {
    expect(politicianYearHref(`sample-taro~${token}`, 2025, [])).toBe(
      `/p/sample-taro~${token}/2025`,
    );
  });
});
