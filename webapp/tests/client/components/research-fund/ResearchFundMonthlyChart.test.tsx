import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundMonthlyChart, {
  calcResearchFundMonthlyScale,
} from "@/client/components/research-fund/ResearchFundMonthlyChart";
import type { ResearchFundMonthView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

function year(publishedMonths: Record<number, { granted: number; spent: number }>) {
  return Array.from({ length: 12 }, (_, index): ResearchFundMonthView => {
    const values = publishedMonths[index + 1];
    return {
      month: `2026-${String(index + 1).padStart(2, "0")}`,
      granted: values?.granted ?? 0,
      spent: values?.spent ?? 0,
      published: values !== undefined,
    };
  });
}

describe("calcResearchFundMonthlyScale", () => {
  it("政治団体ページと同じ規則で 0 を挟んだ対称な 1/2/5×10ⁿ 刻みの目盛りにする", () => {
    // 最大100万円 × 1.2 / 2 = 60万円 → 刻み100万円
    const scale = calcResearchFundMonthlyScale(
      year({ 2: { granted: 1_000_000, spent: 300_000 }, 3: { granted: 1_000_000, spent: 0 } }),
    );
    expect(scale.ticks).toEqual([-2_000_000, -1_000_000, 0, 1_000_000, 2_000_000]);
    expect(scale.yMax).toBe(2_000_000);
    expect(scale.unit).toBe("万円");
  });

  it("金額が小さければ円で表示する", () => {
    const scale = calcResearchFundMonthlyScale(year({ 1: { granted: 5_000, spent: 1_000 } }));
    // 5,000円 × 1.2 / 2 = 3,000円 → 刻み5,000円
    expect(scale.ticks).toEqual([-10_000, -5_000, 0, 5_000, 10_000]);
    expect(scale.unit).toBe("円");
  });

  it("公開済みの月が無くても軸が潰れない", () => {
    const scale = calcResearchFundMonthlyScale(year({}));
    expect(scale.yMax).toBeGreaterThan(0);
    expect(scale.unit).toBe("円");
  });
});

describe("ResearchFundMonthlyChart", () => {
  const markup = renderToStaticMarkup(
    <ResearchFundMonthlyChart
      monthly={year({ 2: { granted: 1_000_000, spent: 300_000 } })}
    />,
  );

  it("1〜12月のラベルを通年で描き、データのない月は薄いグレーにする", () => {
    for (let month = 1; month <= 12; month++) {
      expect(markup).toContain(`>${month}月<`);
    }
    expect(markup).toContain('fill="#B6BCC6">1月<');
    expect(markup).toContain('fill="#4B5563">2月<');
  });

  it("データのない月は棒も点線の空枠も描かない", () => {
    expect(markup).not.toContain("stroke-dasharray");
    expect(markup.match(/fill="#2AA693"/g)).toHaveLength(1);
    expect(markup.match(/fill="#DC2626"/g)).toHaveLength(1);
  });

  it("Y軸ラベルを chart-axis の単位で描く", () => {
    expect(markup).toContain(">200万円<");
    expect(markup).toContain(">-100万円<");
    expect(markup).toContain(">0万円<");
  });
});
