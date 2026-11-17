import { toSankeyFlow } from "@/client/lib/sankey-flow";
import { layoutSankey } from "@/client/lib/sankey-layout";
import { fitSankeyToBox } from "@/app/_og-image/og-sankey";
import type { SankeyData } from "@/types/sankey";

const M = 10_000;
const data: SankeyData = {
  nodes: [
    { id: "t", label: "合計", nodeType: "total" },
    { id: "i1", label: "寄附", nodeType: "income" },
    { id: "s1", label: "個人からの寄附", nodeType: "income-sub" },
    { id: "i2", label: "昨年からの現金残高", nodeType: "income" },
    { id: "e1", label: "政治活動費", nodeType: "expense" },
    { id: "x1", label: "宣伝費", nodeType: "expense-sub" },
    { id: "x2", label: "組織活動費", nodeType: "expense-sub" },
    { id: "x3", label: "選挙関係費", nodeType: "expense-sub" },
    { id: "x4", label: "その他（政治活動費）", nodeType: "expense-sub" },
    { id: "c", label: "現金残高", nodeType: "expense" },
  ],
  links: [
    { source: "s1", target: "i1", value: 900 * M },
    { source: "i1", target: "t", value: 900 * M },
    { source: "i2", target: "t", value: 300 * M },
    { source: "t", target: "e1", value: 1000 * M },
    { source: "e1", target: "x1", value: 400 * M },
    { source: "e1", target: "x2", value: 300 * M },
    { source: "e1", target: "x3", value: 200 * M },
    { source: "e1", target: "x4", value: 100 * M },
    { source: "t", target: "c", value: 200 * M },
  ],
};

const box = { x: 64, y: 170, width: 1072, height: 360 };
const options = { labelBottomLimit: 300, labelOffset: 24 };

function fit() {
  const layout = layoutSankey(toSankeyFlow(data), {
    inTitle: "収入",
    outTitle: "支出・残高",
    nameOnly: true,
    labelScale: 1.3,
  });
  return fitSankeyToBox(layout, box, options);
}

describe("layoutSankey（nameOnly）", () => {
  it("ラベルを項目名だけにし、金額・割合を出さない", () => {
    const layout = layoutSankey(toSankeyFlow(data), {
      inTitle: "収入",
      outTitle: "支出・残高",
      nameOnly: true,
    });
    const texts = layout.labels.flatMap((l) => l.texts.map((t) => t.text));
    expect(texts).toContain("個人からの寄附");
    expect(texts.some((t) => /円|%/.test(t))).toBe(false);
    expect(layout.labels.flatMap((l) => l.pills)).toHaveLength(0);
  });
});

describe("fitSankeyToBox", () => {
  it("合計の柱（濃いグレーの棒）の中心を画像の左右中央に置く", () => {
    const hub = fit().svg.match(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"[^>]*fill="#4F566B"/);
    expect(hub).not.toBeNull();
    const center = Number(hub?.[1]) + Number(hub?.[2]) / 2;
    expect(Math.abs(center - 600)).toBeLessThan(1);
  });

  it("ラベルを枠の中に収める", () => {
    for (const t of fit().texts) {
      expect(t.y - t.fontSize / 2).toBeGreaterThanOrEqual(box.y - 1);
      expect(t.y + t.fontSize / 2).toBeLessThanOrEqual(box.y + box.height + 1);
      expect(t.x).toBeGreaterThanOrEqual(box.x - 1);
      expect(t.x).toBeLessThanOrEqual(box.x + box.width + 1);
    }
  });

  it("右端の列のラベルは、下端の上限より下に出ないよう上へ送り、棒と細い線でつなぐ", () => {
    const { texts, svg } = fit();
    const outer = texts.filter((t) =>
      ["宣伝費", "組織活動費", "選挙関係費", "その他", "（政治活動費）"].includes(t.text),
    );
    expect(outer.length).toBeGreaterThan(0);
    for (const t of outer) expect(t.y + t.fontSize * 0.6).toBeLessThanOrEqual(options.labelBottomLimit + 0.01);
    // 引き出し線は右端の列のラベルの数だけ引く
    expect(svg.match(/stroke="#B9C5C0"/g)).toHaveLength(4);
  });

  it("右端の列の棒を、上限（右下のロゴの手前）より左に置く", () => {
    const layout = layoutSankey(toSankeyFlow(data), {
      inTitle: "収入",
      outTitle: "支出・残高",
      nameOnly: true,
    });
    const { svg } = fitSankeyToBox(layout, box, { ...options, columnRightLimit: 900 });
    const rights = [...svg.matchAll(/<rect x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/g)].map(
      (m) => Number(m[1]) + Number(m[2]),
    );
    expect(Math.max(...rights)).toBeLessThanOrEqual(900.1);
  });
});

