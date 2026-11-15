import { toSankeyFlow } from "@/client/lib/sankey-flow";
import type { SankeyData } from "@/types/sankey";

/** 政党の図：収入の内訳 → 収入 → 合計 → 支出（と現金残高） → 支出の内訳 */
const POLITICAL: SankeyData = {
  nodes: [
    { id: "is-a", label: "個人からの寄附", nodeType: "income-sub" },
    { id: "is-b", label: "政治団体からの寄附", nodeType: "income-sub" },
    { id: "i-prev", label: "昨年からの現金残高", nodeType: "income" },
    { id: "i-don", label: "寄附", nodeType: "income" },
    { id: "i-fee", label: "党費・会費", nodeType: "income" },
    { id: "t", label: "合計", nodeType: "total" },
    { id: "e-cash", label: "現金残高", nodeType: "expense" },
    { id: "e-proc", label: "(仕訳中)", nodeType: "expense" },
    { id: "e-act", label: "政治活動費", nodeType: "expense" },
    { id: "e-run", label: "経常経費", nodeType: "expense" },
    { id: "es-other", label: "その他（政治活動費）", nodeType: "expense-sub" },
    { id: "es-ad", label: "宣伝費", nodeType: "expense-sub" },
    { id: "es-staff", label: "人件費", nodeType: "expense-sub" },
  ],
  links: [
    { source: "is-a", target: "i-don", value: 300 },
    { source: "is-b", target: "i-don", value: 500 },
    { source: "i-prev", target: "t", value: 1000 },
    { source: "i-don", target: "t", value: 800 },
    { source: "i-fee", target: "t", value: 200 },
    { source: "t", target: "e-cash", value: 900 },
    { source: "t", target: "e-proc", value: 600 },
    { source: "t", target: "e-act", value: 400 },
    { source: "t", target: "e-run", value: 100 },
    { source: "e-act", target: "es-other", value: 300 },
    { source: "e-act", target: "es-ad", value: 100 },
    { source: "e-run", target: "es-staff", value: 100 },
  ],
};

/** 調研費の図：公費から支給 → 合計 → 各費目・未使用 */
const RESEARCH_FUND: SankeyData = {
  nodes: [
    { id: "income-grant", label: "公費から支給", nodeType: "income" },
    { id: "total", label: "合計", nodeType: "total" },
    { id: "expense-0", label: "交通費", nodeType: "expense" },
    { id: "expense-1", label: "その他", nodeType: "expense" },
    { id: "expense-2", label: "未使用・未処理", nodeType: "expense" },
  ],
  links: [
    { source: "income-grant", target: "total", value: 1000 },
    { source: "total", target: "expense-0", value: 100 },
    { source: "total", target: "expense-1", value: 300 },
    { source: "total", target: "expense-2", value: 600 },
  ],
};

describe("toSankeyFlow", () => {
  it("収入は大きい順で「昨年からの現金残高」を最後に、内訳は親ごとに大きい順に並べる", () => {
    const flow = toSankeyFlow(POLITICAL);

    expect(flow.total).toBe(2000);
    expect(flow.incomes.map((item) => [item.label, item.value])).toEqual([
      ["寄附", 800],
      ["党費・会費", 200],
      ["昨年からの現金残高", 1000],
    ]);
    expect(flow.incomes[0].subs).toEqual([
      { label: "政治団体からの寄附", value: 500 },
      { label: "個人からの寄附", value: 300 },
    ]);
    expect(flow.incomes[1].subs).toBeUndefined();
  });

  it("支出は大きい順で「(仕訳中)」を後ろに、現金残高は支出から外して残高にする", () => {
    const flow = toSankeyFlow(POLITICAL);

    expect(flow.expenses.map((item) => item.label)).toEqual(["政治活動費", "経常経費", "(仕訳中)"]);
    // 「その他」を含む内訳は金額によらず後ろに置く
    expect(flow.expenses[0].subs?.map((sub) => sub.label)).toEqual(["宣伝費", "その他（政治活動費）"]);
    expect(flow.balance).toEqual({ label: "現金残高", value: 900 });
  });

  it("調研費は未使用分を残高にし、「その他」を費目の最後に置く", () => {
    const flow = toSankeyFlow(RESEARCH_FUND, { balanceLabel: "未使用・未処理" });

    expect(flow.incomes).toEqual([{ label: "公費から支給", value: 1000, subs: undefined }]);
    expect(flow.expenses.map((item) => item.label)).toEqual(["交通費", "その他"]);
    expect(flow.balance).toEqual({ label: "未使用・未処理", value: 600 });
  });

  it("groupExpensesAs を指定すると、支出をその名前の1項目にまとめて各費目を内訳にする", () => {
    const flow = toSankeyFlow(RESEARCH_FUND, {
      balanceLabel: "未使用・未処理",
      groupExpensesAs: "支出",
    });

    expect(flow.expenses).toEqual([
      {
        label: "支出",
        value: 400,
        subs: [
          { label: "交通費", value: 100 },
          { label: "その他", value: 300 },
        ],
      },
    ]);
    expect(flow.balance?.value).toBe(600);
  });

  it("合計のノードが無ければ空の図にする", () => {
    expect(toSankeyFlow({ nodes: [], links: [] })).toEqual({
      incomes: [],
      expenses: [],
      balance: null,
      total: 0,
    });
  });
});
