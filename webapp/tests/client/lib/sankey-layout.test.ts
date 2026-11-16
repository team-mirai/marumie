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

/** ラベルの文字（項目名・金額）と、割合のピルの文字 */
function labelText(layout: ReturnType<typeof layoutSankey>, key: string) {
  const label = layout.labels.find((l) => l.key === key);
  return label && [...label.texts.map((text) => text.text), ...label.pills.map((pill) => pill.text)];
}

describe("formatSankeyAmount", () => {
  it("億・万円で表し、1万円未満は円で出す（カンマ区切り・ゼロ埋めなし）", () => {
    expect(formatSankeyAmount(123_450_000)).toBe("1億2,345万円");
    expect(formatSankeyAmount(100_120_000)).toBe("1億12万円");
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

  it("区切りの前が長くても、どの行も列の文字数を超えない", () => {
    for (const [label, max] of [
      ["政治団体からの寄附（個人）", 7],
      ["機関紙誌の発行その他+事業収入", 7],
      ["機関紙誌の発行その他の事業による収入", 10],
    ] as const) {
      const lines = wrapSankeyLabel(label, max);
      expect(lines.join("")).toBe(label);
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(max);
    }
  });
});

describe("layoutSankey", () => {
  it("列の見出しは収入を緑、支出側は「支出」の部分だけ赤にする", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(layout.headers.map((header) => header.spans)).toEqual([
      [{ text: "収入", fill: "#0F8472" }],
      [
        { text: "支出", fill: "#DC2626" },
        { text: "・残高", fill: "#0B0F0E" },
      ],
    ]);
    expect(layout.headers[0].fontSize).toBe(19);
  });

  it("「合計」と金額を合計の柱の上に2段で置く", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(layout.hub.title?.text).toBe("合計");
    expect(layout.hub.amount?.text).toBe("1,000万円");
    expect(layout.hub.title?.y ?? 0).toBeLessThan(layout.hub.amount?.y ?? 0);
    expect(layout.hub.amount?.y ?? 0).toBeLessThan(layout.hub.y);
  });

  it("ノード（濃いバー）の太さは 14.4", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(new Set(layout.nodes.map((node) => node.width))).toEqual(new Set([14.4]));
  });

  it("各項目に「項目名 → 金額 → 割合」のラベルを出し、割合はグレーのピルにする。1%未満はピルだけうすく", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(labelText(layout, "o0")).toEqual(["政治活動費", "600万円", "60%"]);
    expect(labelText(layout, "l:政治団体からの寄附")).toEqual(["政治団体からの寄附", "1万円", "1%未満"]);
    expect(nodeByLabel(layout, "政治団体からの寄附").ariaLabel).toBe("政治団体からの寄附 1万円（1%未満）");

    const pillOf = (key: string) => layout.labels.find((l) => l.key === key)?.pills[0];
    expect(pillOf("o0")?.fill).toBe("#F3F4F6");
    expect(pillOf("o0")?.textFill).toBe("#374151");
    expect(pillOf("l:政治団体からの寄附")?.textFill).toBe("#9CA3AF");
    // 1%未満でも名前・金額はほかと同じ色
    const tiny = layout.labels.find((l) => l.key === "l:政治団体からの寄附");
    expect(tiny?.texts.map((text) => text.fill)).toEqual(["#0B0F0E", "#5B6470"]);
    // ピルは金額の右に並ぶ
    const amount = tiny?.texts[1];
    expect(pillOf("l:政治団体からの寄附")?.x ?? 0).toBeGreaterThan(amount?.x ?? 0);
  });

  it("項目名の（）内の補足は70%の大きさの別の行にする", () => {
    const layout = layoutSankey(
      {
        ...FIVE_COLUMNS,
        expenses: [{ label: "その他の経費（政治活動費）", value: 6_000_000 }],
      },
      TITLES,
    );
    const texts = layout.labels.find((l) => l.key === "o0")?.texts ?? [];

    expect(texts.map((text) => text.text)).toEqual(["その他の経費", "（政治活動費）", "600万円"]);
    expect(texts[1].fontSize).toBeCloseTo(texts[0].fontSize * 0.7);
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

  it("ごく小さい項目もノードと帯が見える太さになり、細い帯も色の濃さは変えない", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "政治団体からの寄附").height).toBeGreaterThanOrEqual(6);
    const thin = layout.bands.find((band) => band.keys[0] === "l:政治団体からの寄附");
    expect(thin?.opacity).toBe(0.14);
    const thick = layout.bands.find((band) => band.keys[0] === "l:個人からの寄附");
    expect(thick?.opacity).toBe(0.14);
  });

  it("同じ列のラベルは重ならない", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);
    const ys = ["l:個人からの寄附", "l:政治団体からの寄附"].map((key) => {
      const texts = layout.labels.find((label) => label.key === key)?.texts ?? [];
      return { top: texts[0].y, bottom: texts[texts.length - 1].y };
    });

    expect(ys[1].top).toBeGreaterThan(ys[0].bottom);
  });

  it("内訳のノードには親のキーも持たせ、親をホバーしたときにいっしょに濃く残す", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "宣伝費").keys).toEqual(["r:宣伝費", "o0"]);
    expect(layout.bands.filter((band) => band.keys.includes("o0"))).toHaveLength(3);
  });

  it("内訳をホバーしたときは親のノードとラベルも濃く残す", () => {
    const layout = layoutSankey(FIVE_COLUMNS, TITLES);

    expect(nodeByLabel(layout, "政治活動費").keys).toContain("r:宣伝費");
    expect(layout.labels.find((label) => label.key === "o0")?.keys).toContain("r:宣伝費");
    expect(nodeByLabel(layout, "寄附").keys).toContain("l:個人からの寄附");
  });

  it("支出・残高が収入より多くても、帯は合計の柱の中に収まる", () => {
    const overspent: SankeyFlow = {
      incomes: [{ label: "寄附", value: 1_000_000 }],
      expenses: [{ label: "政治活動費", value: 1_500_000 }],
      balance: null,
      total: 1_000_000,
    };
    const layout = layoutSankey(overspent, TITLES);
    const node = nodeByLabel(layout, "政治活動費");

    expect(node.height).toBeCloseTo(layout.hub.height);
    expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
    expect(layout.hub.amount?.text).toBe("100万円");
    expect(labelText(layout, "o0")).toEqual(["政治活動費", "150万円", "150%"]);
  });

  it("収入が0円でも支出を描き、割合は支出の合計に対して出す", () => {
    const layout = layoutSankey(
      {
        incomes: [],
        expenses: [{ label: "政治活動費", value: 100_000 }],
        balance: null,
        total: 0,
      },
      TITLES,
    );

    expect(nodeByLabel(layout, "政治活動費").height).toBeCloseTo(layout.hub.height);
    expect(labelText(layout, "o0")).toEqual(["政治活動費", "10万円", "100%"]);
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
    const rightX = nodeByLabel(twoSides, "交通費").x + 14.4;
    expect(twoSides.hub.x + twoSides.hub.width / 2).toBe(600);
    expect(600 - leftX).toBe(rightX - 600);
    // 項目名と金額を1行に並べる
    const inline = twoSides.labels.find((label) => label.key === "o0")?.texts ?? [];
    expect(inline.map((text) => text.text)).toEqual(["交通費", "40万円"]);
    expect(inline[0].y).toBe(inline[1].y);
    // 項目が1つだけの列は名前と金額・割合を2行に分ける
    const single = twoSides.labels.find((label) => label.key === "i0")?.texts ?? [];
    expect(single.map((text) => text.text)).toEqual(["公費から支給", "100万円"]);
    expect(single[1].y).toBeGreaterThan(single[0].y);
  });

  it("左の帯を縮める図は、合計から右を左へ寄せる", () => {
    const flow: SankeyFlow = {
      incomes: [{ label: "公費から支給", value: 1_000_000 }],
      expenses: [{ label: "交通費", value: 400_000 }],
      balance: { label: "未使用・未処理", value: 600_000 },
      total: 1_000_000,
    };
    const normal = layoutSankey(flow, { ...TITLES, inline: true });
    const narrow = layoutSankey(flow, { ...TITLES, inline: true, narrowIn: true });
    const inBand = (layout: ReturnType<typeof layoutSankey>) =>
      layout.hub.x - (nodeByLabel(layout, "公費から支給").x + 14.4);

    expect(inBand(narrow)).toBeCloseTo(inBand(normal) * 0.8, 0);
    expect(nodeByLabel(narrow, "交通費").x).toBeLessThan(nodeByLabel(normal, "交通費").x);
  });

  it("区分を切り替えるほかの図を渡すと、合計の柱の位置・大きさと図の高さをそろえる", () => {
    const plain: SankeyFlow = {
      incomes: [{ label: "寄附", value: 10_000_000 }],
      expenses: [{ label: "政治活動費", value: 6_000_000 }],
      balance: { label: "現金残高", value: 4_000_000 },
      total: 10_000_000,
    };
    const a = layoutSankey(FIVE_COLUMNS, TITLES, [plain]);
    const b = layoutSankey(plain, TITLES, [FIVE_COLUMNS]);

    expect(b.hub).toMatchObject({ x: a.hub.x, y: a.hub.y, height: a.hub.height });
    expect(b.height).toBe(a.height);
    expect([b.x, b.width]).toEqual([a.x, a.width]);
    // 内訳の列が無い図も、内訳のある図と同じ列の位置に置く
    expect(nodeByLabel(b, "寄附").x).toBe(nodeByLabel(a, "寄附").x);
  });

  it("ラベルの外側に余白を残して、左右の空きを切り出す", () => {
    const layout = layoutSankey(
      {
        incomes: [{ label: "寄附", value: 1_000_000 }],
        expenses: [{ label: "政治活動費", value: 1_000_000 }],
        balance: null,
        total: 1_000_000,
      },
      TITLES,
    );

    expect(layout.x).toBeGreaterThan(0);
    expect(layout.x + layout.width).toBeLessThan(1200);
  });

  it("ラベルが短くても、列の見出しは切り出す範囲からはみ出さない", () => {
    const layout = layoutSankey(
      {
        incomes: [{ label: "昨年からの現金残高", value: 3_000_000 }],
        expenses: [{ label: "(仕訳中)", value: 3_000_000 }],
        balance: null,
        total: 3_000_000,
      },
      TITLES,
    );

    for (const header of layout.headers) {
      const half = (header.text.length * header.fontSize) / 2;
      expect(header.x - half).toBeGreaterThanOrEqual(layout.x);
      expect(header.x + half).toBeLessThanOrEqual(layout.x + layout.width);
    }
  });

  it("SP の背の高い版は合計の柱を長く、文字を大きくする", () => {
    const pc = layoutSankey(FIVE_COLUMNS, TITLES);
    const tall = layoutSankey(FIVE_COLUMNS, { ...TITLES, tall: true });

    expect(tall.hub.height).toBeGreaterThan(pc.hub.height);
    expect(tall.headers[0].fontSize).toBe(27);
    expect(tall.height).toBeGreaterThan(pc.height);
  });
});
