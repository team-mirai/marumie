import { renderToStaticMarkup } from "react-dom/server";
import MonthlyChart from "@/client/components/top-page/features/charts/MonthlyChart";

const data = Array.from({ length: 12 }, (_, index) => ({
  yearMonth: `2026-${String(index + 1).padStart(2, "0")}`,
  income: index === 1 ? 15_370_000 : 1_000_000,
  expense: index === 1 ? 0 : 400_000,
}));

describe("MonthlyChart", () => {
  const markup = renderToStaticMarkup(<MonthlyChart data={data} />);

  it("1〜12月のラベルを描く", () => {
    for (let month = 1; month <= 12; month++) {
      expect(markup).toContain(`>${month}月<`);
    }
  });

  it("棒は外側の端だけ角を丸めた path で描き、金額が 0 の棒は描かない", () => {
    expect(markup.match(/<path d="M[^"]+Q[^"]+" fill="#2AA693"/g)).toHaveLength(12);
    expect(markup.match(/<path d="M[^"]+Q[^"]+" fill="#DC2626"/g)).toHaveLength(11);
  });

  it("0の線は薄いグレーにし、y軸の縦線は描かない", () => {
    expect(markup).toContain('stroke="#9CA3AF"');
    expect(markup).not.toContain('stroke="#E2E8F0"');
  });

  it("収支を折れ線と点で重ねる", () => {
    expect(markup).toContain("<polyline");
    expect(markup.match(/<circle /g)).toHaveLength(12);
  });

  it("金額は他の金額と同じ書き方（カンマ・ゼロ埋めなし）で読み上げ用の表にも出す", () => {
    expect(markup).toContain(
      '<th scope="row">2月</th><td>1,537万円</td><td>0円</td><td>1,537万円</td>',
    );
    expect(markup).toContain(
      '<th scope="row">1月</th><td>100万円</td><td>40万円</td><td>60万円</td>',
    );
  });

  it("データが無いときは空の表示にする", () => {
    expect(renderToStaticMarkup(<MonthlyChart data={[]} />)).toContain("データがありません");
  });
});
