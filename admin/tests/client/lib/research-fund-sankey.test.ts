import { layoutResearchFundSankey, spreadLabelCenters } from "@/client/lib/research-fund-sankey";
import type { ResearchFundCategoryTotal } from "@/shared/research-fund/aggregation";

function category(
  key: string,
  totalAmount: number,
  kind: ResearchFundCategoryTotal["kind"] = "expense",
): ResearchFundCategoryTotal {
  return { key, label: key === "unused" ? "未使用" : key, kind, totalAmount };
}

test("描くものが無ければ null を返す", () => {
  expect(layoutResearchFundSankey(0, [category("unused", 0, "unused")])).toBeNull();
  expect(layoutResearchFundSankey(1_000_000, [])).toBeNull();
  expect(layoutResearchFundSankey(1_000_000, [category("unused", 0, "unused")])).toBeNull();
});

test("viewBox はラベル分の余白を含まない図の描画域だけを持つ", () => {
  const layout = layoutResearchFundSankey(1_000_000, [
    category("taxi", 400_000),
    category("unused", 600_000, "unused"),
  ]);

  // 右ノードの右端（400 + 12）と本体の下端（8 + 160）で切る
  expect(layout?.viewBox).toBe("0 0 412 168");
  expect(layout?.grantNode).toEqual({ x: 30, y: 8, width: 12, height: 160 });
  expect(layout?.bands.map((band) => band.node.x)).toEqual([400, 400]);
});

test("費目のノードは金額に比例し、費目どうしの隙間の分だけ縮めて積む", () => {
  const layout = layoutResearchFundSankey(1_000_000, [
    category("taxi", 250_000),
    category("postage", 250_000),
    category("unused", 500_000, "unused"),
  ]);
  const heights = layout?.bands.map((band) => band.node.height) ?? [];

  // 本体 160 から隙間 4 x 2 を引いた 152 を 1:1:2 で分ける
  expect(heights).toEqual([38, 38, 76]);
  expect(layout?.bands.map((band) => band.node.y)).toEqual([8, 50, 92]);
});

test("ラベルの縦位置はノードの中心を描画域の高さに対する % で表す", () => {
  const layout = layoutResearchFundSankey(1_000_000, [
    category("taxi", 500_000),
    category("unused", 500_000, "unused"),
  ]);

  // 1本目は y=8 高さ=78 → 中心 47、2本目は y=90 高さ=78 → 中心 129（いずれも 168 分の割合）
  expect(layout?.bands[0].labelTopPercent).toBeCloseTo((47 / 168) * 100);
  expect(layout?.bands[1].labelTopPercent).toBeCloseTo((129 / 168) * 100);
  expect(layout?.grantLabelLeftPercent).toBeCloseTo((30 / 412) * 100);
});

test("支出が支給を超えて未使用が負でも、描画は 0 として扱いラベルの金額は実額のまま返す", () => {
  const layout = layoutResearchFundSankey(1_000_000, [
    category("taxi", 1_200_000),
    category("unused", -200_000, "unused"),
  ]);
  const unused = layout?.bands[1];

  expect(unused?.node.height).toBe(0);
  expect(unused?.amount).toBe(-200_000);
  expect(layout?.bands[0].node.height).toBe(156);
});

test("リボンは支給ノードの右端から費目ノードの左端まで引く", () => {
  const layout = layoutResearchFundSankey(1_000_000, [category("taxi", 1_000_000)]);
  const ribbon = layout?.bands[0].ribbon ?? "";

  // 左ノード右端 x=42 の本体上端から右ノード左端 x=400 へ渡り、下端 168 を通って閉じる
  expect(ribbon.startsWith("M 42 8 C ")).toBe(true);
  expect(ribbon).toContain(" 400 8 L 400 168 C ");
  expect(ribbon.endsWith(" 42 168 Z")).toBe(true);
});

test("金額の小さい費目が続いても、ラベルの中心は最小間隔まで押し下げられる", () => {
  // 1 費目だけ大きく、残り 10 費目はノードの帯が 1px 未満になる金額にする
  const layout = layoutResearchFundSankey(10_000_000, [
    category("big", 9_990_000),
    ...Array.from({ length: 9 }, (_, index) => category(`tiny-${index}`, 1_000)),
    category("unused", 1_000, "unused"),
  ]);
  const tops = layout?.bands.map((band) => band.labelTopPercent) ?? [];
  const gaps = tops.slice(1).map((top, index) => top - tops[index]);

  expect(tops).toHaveLength(11);
  // 11 行は下限の 200px に収まる（10 x 16 + 14 = 174px）ので、最小間隔は 16 / 200 = 8%
  expect(layout?.minHeight).toBe(200);
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(8 - 1e-9);
  expect(Math.min(...tops)).toBeGreaterThanOrEqual(3.5 - 1e-9);
  expect(Math.max(...tops)).toBeLessThanOrEqual(96.5 + 1e-9);
});

test("費目が多くて 200px に収まらないときは、図の高さの下限をラベルの行数ぶんまで広げる", () => {
  const layout = layoutResearchFundSankey(
    10_000_000,
    Array.from({ length: 20 }, (_, index) => category(`c-${index}`, 1_000)).concat(
      category("unused", 9_980_000, "unused"),
    ),
  );
  const tops = layout?.bands.map((band) => band.labelTopPercent) ?? [];
  const gaps = tops.slice(1).map((top, index) => top - tops[index]);

  // 21 行 = 20 x 16 + 14 = 334px。どの間隔も 16px 相当（16 / 334 %）を下回らない
  expect(layout?.minHeight).toBe(334);
  const minSpacing = (16 / 334) * 100;
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(minSpacing - 1e-9);
  expect(Math.min(...tops)).toBeGreaterThanOrEqual((7 / 334) * 100 - 1e-9);
  expect(Math.max(...tops)).toBeLessThanOrEqual(100 - (7 / 334) * 100 + 1e-9);
});

test("間隔が足りている費目のラベルはノードの中心のまま動かさない", () => {
  const layout = layoutResearchFundSankey(1_000_000, [
    category("taxi", 500_000),
    category("unused", 500_000, "unused"),
  ]);

  expect(layout?.bands[0].labelTopPercent).toBeCloseTo((47 / 168) * 100);
  expect(layout?.bands[1].labelTopPercent).toBeCloseTo((129 / 168) * 100);
});

describe("spreadLabelCenters", () => {
  test("空の入力は空を返す", () => {
    expect(spreadLabelCenters([], 10, { min: 0, max: 100 })).toEqual([]);
  });

  test("最小間隔を満たしている中心はそのまま返す", () => {
    expect(spreadLabelCenters([20, 50, 80], 10, { min: 0, max: 100 })).toEqual([20, 50, 80]);
  });

  test("近すぎる中心は順序を保ったまま押し下げる", () => {
    expect(spreadLabelCenters([20, 22, 24], 10, { min: 0, max: 100 })).toEqual([20, 30, 40]);
  });

  test("下端を越える分は上へ押し戻す", () => {
    expect(spreadLabelCenters([90, 92, 94], 10, { min: 0, max: 100 })).toEqual([80, 90, 100]);
  });

  test("上端より手前の中心は上端まで押し下げる", () => {
    expect(spreadLabelCenters([-5, 0, 40], 10, { min: 0, max: 100 })).toEqual([0, 10, 40]);
  });

  test("最小間隔で詰めても入りきらないときは等間隔に散らす", () => {
    expect(spreadLabelCenters([10, 11, 12], 60, { min: 0, max: 100 })).toEqual([0, 50, 100]);
  });

  test("1 つだけのときは範囲に収めるだけで動かさない", () => {
    expect(spreadLabelCenters([10], 60, { min: 0, max: 40 })).toEqual([10]);
    expect(spreadLabelCenters([50], 60, { min: 0, max: 40 })).toEqual([40]);
  });
});
