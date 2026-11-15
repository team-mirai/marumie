import type { SankeyFlow } from "@/client/lib/sankey-flow";
import { formatSankeyAmount, layoutSankey, wrapSankeyLabel } from "@/client/lib/sankey-layout";

const TITLES = { inTitle: "収入", outTitle: "支出・残高" };

const FIVE_COLUMNS: SankeyFlow = {
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
      value: 6_000_000,
      subs: [
        { label: "宣伝費", value: 5_000_000 },
        { label: "組織活動費", value: 1_000_000 },
      ],
    },
  ],
  balance: { label: "現金残高", value: 4_000_000 },
  total: 10_000_000,
};

function nodeByLabel(layout: ReturnType<typeof layoutSankey>, prefix: string) {
  const node = layout.nodes.find((n) => n.ariaLabel.startsWith(`${prefix} `));
  if (!node) throw new Error(`${prefix} が無い`);
  return node;
}

function labelText(layout: ReturnType<typeof layoutSankey>, key: string) {
  return layout.labels.find((label) => label.key === key)?.spans.map((span) => span.text);
}

describe("formatSankeyAmount", () => {
  it("億・万円で表し、1万円未満は円で出す", () => {
    expect(formatSankeyAmount(123_450_000)).toBe("1億2345万円");
    expect(formatSankeyAmount(100_120_000)).toBe("1億0012万円");
    expect(formatSankeyAmount(200_000_000)).toBe("2億円");
    expect(formatSankeyAmount(30_004_000)).toBe("3,000万円");
    expect(formatSankeyAmount(5_000)).toBe("5,000円");
  });
});

describe("wrapSankeyLabel", () => {
  it("列の文字数に収まる名前は折り返さない", () => {
    expect(wrapSankeyLabel("政治活動費", 7)).toEqual(["政治活動費"]);
  });

  it("「（」の前、「+」の後、「の」の後で折り返す", () => {
    expect(wrapSankeyLabel("その他（政治活動費）", 7)).toEqual(["その他", "（政治活動費）"]);
    expect(wrapSankeyLabel("機関紙誌+その他事業収入", 7)).toEqual(["機関紙誌+", "その他事業収入"]);
    expect(wrapSankeyLabel("政治団体からの寄附", 7)).toEqual(["政治団体からの", "寄附"]);
  });
});

describe("layoutSankey", () => {
  it("列の見出しと合計の柱・合計金額を置く", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(layout.headers.map((header) => header.text)).toEqual(["収入", "支出・残高"]);
    expect(layout.hub.title.text).toBe("合計");
    expect(layout.hub.amount.text).toBe("1,000万円");
    expect(layout.hub.amount.y).toBeGreaterThan(layout.hub.y + layout.hub.height);
  });

  it("各項目に「項目名」と「金額　割合」のラベルを出す。1%未満は「1%未満」", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(labelText(layout, "o0")).toEqual(["政治活動費", "600万円　60%"]);
    expect(labelText(layout, "l:政治団体からの寄附")).toEqual(["政治団体からの寄附", "1万円　1%未満"]);
    expect(nodeByLabel(layout, "政治団体からの寄附").ariaLabel).toBe("政治団体からの寄附 1万円（1%未満）");
  });

  it("色は収入＝緑、支出＝赤、現金残高・昨年からの現金残高＝グレー", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "寄附").color).toBe("#2AA693");
    expect(nodeByLabel(layout, "個人からの寄附").color).toBe("#2AA693");
    expect(nodeByLabel(layout, "政治活動費").color).toBe("#DC2626");
    expect(nodeByLabel(layout, "宣伝費").color).toBe("#DC2626");
    expect(nodeByLabel(layout, "現金残高").color).toBe("#6B7280");
    expect(nodeByLabel(layout, "昨年からの現金残高").color).toBe("#6B7280");
  });

  it("ごく小さい項目もノードと帯が見える太さになり、細い帯は色を濃くする", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "政治団体からの寄附").height).toBeGreaterThanOrEqual(6);
    const thin = layout.bands.find((band) => band.keys[0] === "l:政治団体からの寄附");
    expect(thin?.opacity).toBe(0.5);
    const thick = layout.bands.find((band) => band.keys[0] === "l:個人からの寄附");
    expect(thick?.opacity).toBe(0.14);
  });

  it("同じ列のラベルは重ならない", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);
    const ys = ["l:個人からの寄附", "l:政治団体からの寄附"].map((key) => {
      const spans = layout.labels.find((label) => label.key === key)?.spans ?? [];
      return { top: spans[0].y ?? 0, bottom: spans[spans.length - 1].y ?? 0 };
    });

    expect(ys[1].top).toBeGreaterThan(ys[0].bottom);
  });

  it("内訳のノードには親のキーも持たせ、親をホバーしたときにいっしょに濃く残す", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "宣伝費").keys).toEqual(["r:宣伝費", "o0"]);
    expect(layout.bands.filter((band) => band.keys.includes("o0"))).toHaveLength(3);
  });

  it("収入側に内訳が無ければ3列を横幅いっぱいに均等に、左右とも無ければ合計を中央に置く", () => {
    const threeColumns: SankeyFlow = {
      incomes: [{ label: "公費から支給", value: 1_000_000 }],
      expenses: [{ label: "支出", value: 400_000, subs: [{ label: "交通費", value: 400_000 }] }],
      balance: { label: "未使用・未処理", value: 600_000 },
      total: 1_000_000,
    };
    const spread = layoutSankey(threeColumns, TITLES);
    expect(nodeByLabel(spread, "公費から支給").x).toBe(220);
    expect(spread.hub.x).toBe(470);
    expect(nodeByLabel(spread, "支出").x).toBe(720);

    const twoSides = layoutSankey(
      { ...threeColumns, expenses: [{ label: "交通費", value: 400_000 }] },
      { ...TITLES, inline: true },
    );
    const leftX = nodeByLabel(twoSides, "公費から支給").x;
    const rightX = nodeByLabel(twoSides, "交通費").x + 12;
    expect(twoSides.hub.x + twoSides.hub.width / 2).toBe(600);
    expect(600 - leftX).toBe(rightX - 600);
    // 項目名と金額を1行に並べる
    const inlineSpans = twoSides.labels.find((label) => label.key === "o0")?.spans;
    expect(inlineSpans?.map((span) => span.text)).toEqual(["交通費", "40万円　40%"]);
    expect(inlineSpans?.[1].dx).toBe(12);
  });

  it("SP の背の高い版は合計の柱を長く、文字を大きくする", () => {
    const pc = layoutSankey(FIVE_COLUMNS, TITLES);
    const tall = layoutSankey(FIVE_COLUMNS, { ...TITLES, tall: true });

    expect(tall.hub.height).toBeGreaterThan(pc.hub.height);
    expect(tall.headers[0].fontSize).toBeGreaterThan(pc.headers[0].fontSize);
    expect(tall.height).toBeGreaterThan(pc.height);
  });
});
