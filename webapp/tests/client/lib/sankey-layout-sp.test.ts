import type { SankeyFlow } from "@/client/lib/sankey-flow";
import { layoutSankeySp, wrapSankeySpLabel } from "@/client/lib/sankey-layout-sp";

const TITLES = { inTitle: "収入", outTitle: "支出・残高" };

const FLOW: SankeyFlow = {
  incomes: [
    {
      label: "寄附",
      value: 8_000_000,
      subs: [
        { label: "個人からの寄附", value: 7_990_000 },
        { label: "政治団体からの寄附", value: 10_000 },
      ],
    },
    { label: "昨年からの現金残高", value: 2_000_000 },
  ],
  expenses: [
    {
      label: "政治活動費",
      value: 5_950_000,
      subs: [
        { label: "宣伝費", value: 4_950_000 },
        { label: "組織活動費", value: 1_000_000 },
      ],
    },
    { label: "経常経費", value: 50_000 },
  ],
  balance: { label: "現金残高", value: 4_000_000 },
  total: 10_000_000,
};

function labelText(layout: ReturnType<typeof layoutSankeySp>, key: string) {
  return layout.labels.find((label) => label.key === key)?.spans.map((span) => span.text);
}

describe("wrapSankeySpLabel", () => {
  it("8文字以内の名前は折り返さない", () => {
    expect(wrapSankeySpLabel("政治活動費", 8)).toEqual(["政治活動費"]);
  });

  it("「+」があればその後で、無ければ文字数で2行に分ける", () => {
    expect(wrapSankeySpLabel("機関紙誌+その他事業収入", 8)).toEqual(["機関紙誌+", "その他事業収入"]);
    expect(wrapSankeySpLabel("昨年からの現金残高", 8)).toEqual(["昨年からの現金残", "高"]);
  });

  it("2行に収まらない名前は2行目の末尾を「…」で詰める", () => {
    const lines = wrapSankeySpLabel("機関紙誌の発行その他の事業による収入", 8);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toHaveLength(8);
    expect(lines[1].endsWith("…")).toBe(true);
  });
});

describe("layoutSankeySp", () => {
  it("内訳を親にまとめ、収入 → 合計 → 支出・残高の3列にする", () => {
    const layout = layoutSankeySp(FLOW, TITLES);

    expect(layout.width).toBe(400);
    expect(new Set(layout.nodes.map((node) => node.x)).size).toBe(2);
    expect(layout.nodes.map((node) => node.ariaLabel)).toEqual([
      "寄附 800万円（80%）",
      "昨年からの現金残高 200万円（20%）",
      "政治活動費 595万円（60%）",
      "経常経費 5万円（1%未満）",
      "現金残高 400万円（40%）",
    ]);
    expect(layout.headers.map((header) => header.text)).toEqual(["収入", "支出・残高"]);
    // 合計は細い柱だけで、「合計」と金額の文字は出さない
    expect(layout.hub.title).toBeNull();
    expect(layout.hub.amount).toBeNull();
  });

  it("収入は緑、支出は赤、残高はグレーで描く", () => {
    const layout = layoutSankeySp(FLOW, TITLES);
    const colorOf = (key: string) => layout.nodes.find((node) => node.key === key)?.color;

    expect(colorOf("i0")).toBe("#2AA693");
    expect(colorOf("i1")).toBe("#6B7280");
    expect(colorOf("o0")).toBe("#DC2626");
    expect(colorOf("cash")).toBe("#6B7280");
  });

  it("各項目の横に項目名と「金額　割合」を出し、1%未満は「1%未満」", () => {
    const tiny: SankeyFlow = {
      ...FLOW,
      expenses: [...FLOW.expenses, { label: "交際費", value: 10_000 }],
      balance: { label: "現金残高", value: 3_990_000 },
    };
    const layout = layoutSankeySp(tiny, TITLES);

    expect(labelText(layout, "o0")).toEqual(["政治活動費", "595万円　60%"]);
    expect(labelText(layout, "o2")).toEqual(["交際費", "1万円　1%未満"]);
  });

  it("ラベルどうしが重ならず、ノードの真横（縦の中央）に来る", () => {
    const layout = layoutSankeySp(FLOW, TITLES);
    const isLeft = (key: string) => key.startsWith("i");
    for (const columnLabels of [
      layout.labels.filter((label) => isLeft(label.key)),
      layout.labels.filter((label) => !isLeft(label.key)),
    ]) {
      let prevBottom = Number.NEGATIVE_INFINITY;
      for (const label of columnLabels) {
        const ys = label.spans.map((span) => span.y ?? 0);
        expect(Math.min(...ys)).toBeGreaterThan(prevBottom);
        prevBottom = Math.max(...ys);
        const node = layout.nodes.find((n) => n.key === label.key);
        if (!node) throw new Error(`${label.key} のノードが無い`);
        const middle = (Math.min(...ys) + Math.max(...ys)) / 2;
        expect(Math.abs(middle - (node.y + node.height / 2))).toBeLessThan(1);
      }
    }
  });

  it("背を低くする倍率を渡すと、合計の柱と図が低くなる", () => {
    const normal = layoutSankeySp(FLOW, TITLES);
    const low = layoutSankeySp(FLOW, { ...TITLES, heightScale: 0.75 });

    expect(low.hub.height).toBeCloseTo(normal.hub.height * 0.75);
    expect(low.height).toBeLessThan(normal.height);
  });

  it("支出・残高が収入より多くても、帯が合計の柱に収まる", () => {
    const layout = layoutSankeySp(
      // ごく小さい項目はノードの高さに下限があるので、大きい項目だけで比べる
      { ...FLOW, expenses: [FLOW.expenses[0]], balance: { label: "現金残高", value: 8_000_000 } },
      TITLES,
    );
    const rights = layout.nodes.filter((node) => node.right);
    const sum = rights.reduce((s, node) => s + node.height, 0);
    expect(sum).toBeLessThanOrEqual(layout.hub.height + 1e-6);
  });
});
