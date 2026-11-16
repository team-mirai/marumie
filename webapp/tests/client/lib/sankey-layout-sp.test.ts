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
  const label = layout.labels.find((l) => l.key === key);
  return label && [...label.texts.map((text) => text.text), ...label.pills.map((pill) => pill.text)];
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
        const ys = label.texts.map((text) => text.y);
        expect(Math.min(...ys)).toBeGreaterThan(prevBottom);
        prevBottom = Math.max(...ys);
        const node = layout.nodes.find((n) => n.key === label.key);
        if (!node) throw new Error(`${label.key} のノードが無い`);
        const middle = (Math.min(...ys) + Math.max(...ys)) / 2;
        expect(Math.abs(middle - (node.y + node.height / 2))).toBeLessThan(1);
      }
    }
  });

  it("小さな項目が続いても、ラベルがノードの真横からずれていかない", () => {
    const many: SankeyFlow = {
      incomes: [{ label: "寄附", value: 1_012_000 }],
      expenses: [
        { label: "人件費", value: 1_000_000 },
        ...Array.from({ length: 12 }, (_, i) => ({ label: `費目${i}`, value: 1_000 })),
      ],
      balance: null,
      total: 1_012_000,
    };
    const layout = layoutSankeySp(many, TITLES);
    for (const label of layout.labels.filter((l) => l.key.startsWith("o"))) {
      const ys = label.texts.map((text) => text.y);
      const node = layout.nodes.find((n) => n.key === label.key);
      if (!node) throw new Error(`${label.key} のノードが無い`);
      const middle = (Math.min(...ys) + Math.max(...ys)) / 2;
      expect(Math.abs(middle - (node.y + node.height / 2))).toBeLessThan(1);
    }
  });

  it("金額がごく小さい項目の帯も見える太さで描き、色の濃さは変えない", () => {
    const layout = layoutSankeySp(
      { ...FLOW, expenses: [{ label: "政治活動費", value: 5_999_999 }], balance: { label: "現金残高", value: 1 } },
      TITLES,
    );
    const band = layout.bands.find((b) => b.key === "ccash");
    if (!band) throw new Error("現金残高の帯が無い");
    // d = M x1 a1 C m a1 m a2 x2 a2 L x2 b2 C ...
    const nums = (band.d.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
    expect(nums[9] - nums[7]).toBeGreaterThanOrEqual(3 - 1e-6);
    expect(band.opacity).toBe(0.18);
  });

  it("見出しは収入を緑、支出側は「支出」の部分だけ赤にする", () => {
    const layout = layoutSankeySp(FLOW, TITLES);

    expect(layout.headers.map((header) => header.spans)).toEqual([
      [{ text: "収入", fill: "#0F8472" }],
      [
        { text: "支出", fill: "#DC2626" },
        { text: "・残高", fill: "#5B6470" },
      ],
    ]);
  });

  it("低めの図は、見出しの「支出」を右の列の位置に出し、右の列を「項目名 → 金額 → 割合」の1行にする", () => {
    const layout = layoutSankeySp(FLOW, { inTitle: "支給", outTitle: "支出・未使用", heightScale: 0.75 });

    expect(layout.headers.map((header) => header.text)).toEqual(["支給", "支出"]);
    expect(layout.headers[1].x).toBe(196);
    expect(layout.headers[1].spans[0].fill).toBe("#DC2626");
    expect(labelText(layout, "o0")).toEqual(["政治活動費", "595万円", "60%"]);
    const texts = layout.labels.find((l) => l.key === "o0")?.texts ?? [];
    expect(texts[0].y).toBe(texts[1].y);
    expect(layout.labels.find((l) => l.key === "o1")?.pills[0].textFill).toBe("#9CA3AF");
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

  it("低めの図の1行のラベルは、項目名を詰めて割合のピルを図の幅に収める", () => {
    const layout = layoutSankeySp(
      {
        incomes: [{ label: "公費から支給", value: 12_340_000 }],
        expenses: [{ label: "広報・広聴活動費", value: 12_340_000 }],
        balance: null,
        total: 12_340_000,
      },
      { inTitle: "支給", outTitle: "支出・未使用", heightScale: 0.75 },
    );
    const label = layout.labels.find((l) => l.key === "o0");
    const pill = label?.pills[0];
    expect(pill && pill.x + pill.width).toBeLessThanOrEqual(layout.width);
    expect(label?.texts[0].text.endsWith("…")).toBe(true);
    // 読み上げには全文を含める
    expect(layout.nodes.find((n) => n.key === "o0")?.ariaLabel).toContain("広報・広聴活動費");
  });

  it("切り替える図を渡すと、合計の柱の位置と図の高さをそろえる", () => {
    const few: SankeyFlow = {
      incomes: [{ label: "公費から支給", value: 1_000_000 }],
      expenses: [{ label: "研究費", value: 1_000_000 }],
      balance: null,
      total: 1_000_000,
    };
    const many: SankeyFlow = {
      incomes: [{ label: "公費から支給", value: 1_000_000 }],
      expenses: Array.from({ length: 12 }, (_, i) => ({ label: `項目${i}`, value: 10_000 })),
      balance: { label: "未使用", value: 880_000 },
      total: 1_000_000,
    };
    const options = { inTitle: "支給", outTitle: "支出・未使用", heightScale: 0.75 };
    const alone = layoutSankeySp(few, options);
    const a = layoutSankeySp(few, options, [many]);
    const b = layoutSankeySp(many, options, [few]);

    expect(layoutSankeySp(many, options).hub.y).toBeGreaterThan(alone.hub.y);
    expect(a.hub.y).toBe(b.hub.y);
    expect(a.height).toBe(b.height);
    expect(a.nodes.find((n) => n.key === "i0")?.y).toBe(b.nodes.find((n) => n.key === "i0")?.y);
  });
});
