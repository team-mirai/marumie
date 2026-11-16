import { renderToStaticMarkup } from "react-dom/server";
import MonthlyChartScroll from "@/client/components/top-page/features/charts/MonthlyChartScroll";

describe("MonthlyChartScroll", () => {
  const markup = renderToStaticMarkup(
    <MonthlyChartScroll>
      <svg />
    </MonthlyChartScroll>,
  );

  it("横にスクロールできることを読み上げで伝え、キーボードでフォーカスできる領域にする", () => {
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain("<section");
    expect(markup).toContain('aria-label="月ごとの推移のグラフ（横にスクロールできます）"');
  });

  it("グラフは 640px 幅のまま横にスクロールさせる", () => {
    expect(markup).toContain('class="min-w-[640px]"><svg></svg>');
  });

  it("「左右にスクロール」の表示は読み上げない", () => {
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("左右にスクロール</p>");
  });
});
