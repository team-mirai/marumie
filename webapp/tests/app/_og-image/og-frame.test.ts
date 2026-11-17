import {
  buildOgBackgroundSvg,
  ogPatternBlobs,
  ogPatternIndex,
} from "@/app/_og-image/og-frame";

describe("ogPatternIndex", () => {
  it("同じページなら毎回同じ模様の番号になる", () => {
    expect(ogPatternIndex("o/team-mirai/2026")).toBe(ogPatternIndex("o/team-mirai/2026"));
  });

  it("ページ（団体・年）が違えば模様の番号も変わる", () => {
    const keys = ["o/team-mirai/2026", "o/team-mirai/2025", "o/anno/2026", "o/digimin/2026"];
    expect(new Set(keys.map(ogPatternIndex)).size).toBe(keys.length);
  });
});

describe("buildOgBackgroundSvg", () => {
  it("淡いミント2か所・濃いグリーン2か所のぼかしを重ね、番号でぼかしの位置だけを変える", () => {
    const colors = (i: number) => ogPatternBlobs(i).map((b) => b.color);
    expect(colors(1)).toEqual(colors(2));
    expect(colors(1).filter((c) => c === "#F0FCF8")).toHaveLength(2);
    expect(buildOgBackgroundSvg(1)).not.toBe(buildOgBackgroundSvg(2));
    expect(buildOgBackgroundSvg(1)).toBe(buildOgBackgroundSvg(1));
  });
});
