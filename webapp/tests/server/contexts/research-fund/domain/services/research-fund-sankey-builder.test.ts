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
      "未使用",
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

  it("支給が無ければ空のデータを返す", () => {
    expect(
      buildResearchFundSankey(
        aggregation({ kpi: { granted: 0, spent: 0 }, categories: [], unused: 0 }),
      ),
    ).toEqual({ nodes: [], links: [] });
  });
});
