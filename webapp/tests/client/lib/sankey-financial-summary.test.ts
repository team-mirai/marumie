import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import type { SankeyData } from "@/types/sankey";

describe("calculateSankeyFinancialSummary", () => {
  it("合計への流入を収入、合計から現金残高への流出を収支とし、差を支出にする", () => {
    const data: SankeyData = {
      nodes: [
        { id: "income-1", label: "寄附", nodeType: "income" },
        { id: "income-2", label: "交付金", nodeType: "income" },
        { id: "total", label: "合計", nodeType: "total" },
        { id: "expense-1", label: "政治活動費", nodeType: "expense" },
        { id: "cash", label: "現金残高", nodeType: "expense" },
      ],
      links: [
        { source: "income-1", target: "total", value: 300 },
        { source: "income-2", target: "total", value: 700 },
        { source: "total", target: "expense-1", value: 600 },
        { source: "total", target: "cash", value: 400 },
      ],
    };

    expect(calculateSankeyFinancialSummary(data)).toEqual({
      income: 1000,
      expense: 600,
      balance: 400,
    });
  });

  it("現金残高のノードが無ければ、収入をすべて支出として扱う", () => {
    const data: SankeyData = {
      nodes: [
        { id: "income-1", label: "寄附", nodeType: "income" },
        { id: "total", label: "合計", nodeType: "total" },
      ],
      links: [{ source: "income-1", target: "total", value: 500 }],
    };

    expect(calculateSankeyFinancialSummary(data)).toEqual({
      income: 500,
      expense: 500,
      balance: 0,
    });
  });

  it("データが無ければすべて 0 にする", () => {
    expect(calculateSankeyFinancialSummary(null)).toEqual({ income: 0, expense: 0, balance: 0 });
  });
});
