import { buildResearchFundSankey } from "@/server/contexts/research-fund/domain/services/research-fund-sankey-builder";
import type { ResearchFundAggregation } from "@/shared/research-fund/aggregation";

function aggregation(overrides: Partial<ResearchFundAggregation> = {}): ResearchFundAggregation {
  return {
    categories: [
      { key: "taxi", label: "タクシー代", kind: "expense", totalAmount: 300_000 },
      { key: "unused", label: "未使用", kind: "unused", totalAmount: 700_000 },
    ],
    monthly: [],
    kpi: { granted: 1_000_000, spent: 300_000 },
    unused: 700_000,
    ...overrides,
  };
}

describe("buildResearchFundSankey", () => {
  it("支給→合計→費目と未使用のリンクを作る", () => {
    const sankey = buildResearchFundSankey(aggregation());

    expect(sankey.nodes.map((node) => node.label)).toEqual([
      "公費から支給",
      "合計",
      "タクシー代",
      "未使用・未処理",
    ]);
    expect(sankey.links).toEqual([
      { source: "income-grant", target: "total", value: 1_000_000 },
      { source: "total", target: "expense-0", value: 300_000 },
      { source: "total", target: "expense-1", value: 700_000 },
    ]);
  });

  it("ノードIDは英数字だけで採番する（法律上の区分はキーが日本語になるため）", () => {
    const sankey = buildResearchFundSankey(
      aggregation({
        categories: [
          { key: "③ 備品・消耗品費", label: "③ 備品・消耗品費", kind: "expense", totalAmount: 10 },
        ],
      }),
    );

    for (const node of sankey.nodes) expect(node.id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("0円・マイナスの費目は帯にしない", () => {
    const sankey = buildResearchFundSankey(
      aggregation({
        categories: [
          { key: "taxi", label: "タクシー代", kind: "expense", totalAmount: 300_000 },
          { key: "unused", label: "未使用", kind: "unused", totalAmount: -1 },
        ],
      }),
    );

    expect(sankey.nodes.map((node) => node.label)).toEqual(["公費から支給", "合計", "タクシー代"]);
  });

  it("費目は金額の多い順に並べ、未使用分を末尾に置く", () => {
    const sankey = buildResearchFundSankey(
      aggregation({
        categories: [
          { key: "a", label: "書籍代", kind: "expense", totalAmount: 100_000 },
          { key: "b", label: "タクシー代", kind: "expense", totalAmount: 300_000 },
          { key: "unused", label: "未使用", kind: "unused", totalAmount: 600_000 },
        ],
        kpi: { granted: 1_000_000, spent: 400_000 },
      }),
    );

    expect(sankey.nodes.slice(2).map((node) => node.label)).toEqual([
      "タクシー代",
      "書籍代",
      "未使用・未処理",
    ]);
  });

  describe("支給額の1%未満の費目", () => {
    const small = (
      categories: { label: string; totalAmount: number }[],
    ): ResearchFundAggregation["categories"] => [
      ...categories.map((category) => ({
        key: category.label,
        label: category.label,
        kind: "expense" as const,
        totalAmount: category.totalAmount,
      })),
      { key: "unused", label: "未使用", kind: "unused", totalAmount: 100_000 },
    ];

    it("2つ以上あれば「その他」1ノードにまとめ、内訳を持たせる", () => {
      const sankey = buildResearchFundSankey(
        aggregation({
          categories: small([
            { label: "タクシー代", totalAmount: 890_000 },
            { label: "郵送費", totalAmount: 3_000 },
            { label: "手数料", totalAmount: 7_000 },
          ]),
        }),
      );

      expect(sankey.nodes.slice(2)).toEqual([
        { id: "expense-0", label: "タクシー代", nodeType: "expense" },
        {
          id: "expense-1",
          label: "その他",
          nodeType: "expense",
          breakdown: [
            { label: "手数料", amount: 7_000 },
            { label: "郵送費", amount: 3_000 },
          ],
        },
        { id: "expense-2", label: "未使用・未処理", nodeType: "expense" },
      ]);
      expect(sankey.links.find((link) => link.target === "expense-1")?.value).toBe(10_000);
    });

    it("ちょうど1%の費目はまとめない", () => {
      const sankey = buildResearchFundSankey(
        aggregation({
          categories: small([
            { label: "タクシー代", totalAmount: 880_000 },
            { label: "会費", totalAmount: 10_000 },
            { label: "郵送費", totalAmount: 3_000 },
            { label: "手数料", totalAmount: 7_000 },
          ]),
        }),
      );

      expect(sankey.nodes.slice(2).map((node) => node.label)).toEqual([
        "タクシー代",
        "会費",
        "その他",
        "未使用・未処理",
      ]);
    });

    it("1つだけならまとめずにその費目のまま出す", () => {
      const sankey = buildResearchFundSankey(
        aggregation({
          categories: small([
            { label: "タクシー代", totalAmount: 897_000 },
            { label: "郵送費", totalAmount: 3_000 },
          ]),
        }),
      );

      expect(sankey.nodes.slice(2).map((node) => node.label)).toEqual([
        "タクシー代",
        "郵送費",
        "未使用・未処理",
      ]);
      expect(sankey.nodes.some((node) => node.breakdown)).toBe(false);
    });

    it("もともとの「その他」の費目もラベルが重ならないよう一緒にまとめる", () => {
      const sankey = buildResearchFundSankey(
        aggregation({
          categories: small([
            { label: "タクシー代", totalAmount: 850_000 },
            { label: "その他", totalAmount: 40_000 },
            { label: "郵送費", totalAmount: 3_000 },
            { label: "手数料", totalAmount: 7_000 },
          ]),
        }),
      );

      const other = sankey.nodes.filter((node) => node.label === "その他");
      expect(other).toHaveLength(1);
      expect(other[0].breakdown).toEqual([
        { label: "その他", amount: 40_000 },
        { label: "手数料", amount: 7_000 },
        { label: "郵送費", amount: 3_000 },
      ]);
    });

    it("法律上の区分でも同じ規則でまとめる", () => {
      const sankey = buildResearchFundSankey(
        aggregation({
          categories: small([
            { label: "⑨ 滞在費", totalAmount: 890_000 },
            { label: "② 光熱水費", totalAmount: 8_300 },
            { label: "④ 事務所費", totalAmount: 1_700 },
          ]),
        }),
      );

      expect(sankey.nodes.slice(2).map((node) => node.label)).toEqual([
        "⑨ 滞在費",
        "その他",
        "未使用・未処理",
      ]);
    });
  });

  it("支給が無ければ空のデータを返す", () => {
    expect(
      buildResearchFundSankey(
        aggregation({ kpi: { granted: 0, spent: 0 }, categories: [], unused: 0 }),
      ),
    ).toEqual({ nodes: [], links: [] });
  });
});
