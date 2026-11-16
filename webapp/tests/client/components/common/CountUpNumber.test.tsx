import { renderToStaticMarkup } from "react-dom/server";
import AmountSummary from "@/client/components/common/AmountSummary";
import CountUpNumber from "@/client/components/common/CountUpNumber";

describe("CountUpNumber", () => {
  it("サーバーレンダリングの HTML には最終値をそのまま入れる", () => {
    const markup = renderToStaticMarkup(<CountUpNumber value="1537" className="num" />);

    expect(markup).toBe('<b class="num">1537</b>');
  });

  it("見出しカードの金額欄の数字を、v9 の書体で最終値のまま描画する", () => {
    const markup = renderToStaticMarkup(
      <AmountSummary items={[{ label: "収入総額", color: "#000000", amount: 726_560_000 }]} />,
    );

    const numbers = [...markup.matchAll(/<b class="([^"]*)">([^<]*)<\/b>/g)];
    expect(numbers.map((m) => m[2])).toEqual(["7", "2656"]);
    for (const m of numbers) {
      expect(m[1].split(" ")).toContain("font-num");
    }
  });

  it("億の下の万が 0 の金額では、万の数字を描かない", () => {
    const markup = renderToStaticMarkup(
      <AmountSummary items={[{ label: "収入総額", color: "#000000", amount: 100_000_000 }]} />,
    );

    const numbers = [...markup.matchAll(/<b class="[^"]*">([^<]*)<\/b>/g)];
    expect(numbers.map((m) => m[1])).toEqual(["1"]);
  });
});
