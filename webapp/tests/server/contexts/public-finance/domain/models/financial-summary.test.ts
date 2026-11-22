import { FinancialSummary } from "@/server/contexts/public-finance/domain/models/financial-summary";
import type { CategoryAggregation } from "@/server/contexts/public-finance/domain/models/category-aggregation";

const aggregation: CategoryAggregation = {
  income: [
    { category: "寄附", subcategory: "個人からの寄附", totalAmount: 6_000_000 },
    { category: "寄附", subcategory: "法人その他の団体からの寄附", totalAmount: 1_000_000 },
    { category: "その他の収入", totalAmount: 500_000 },
  ],
  expense: [{ category: "政治活動費", totalAmount: 4_000_000 }],
};

describe("FinancialSummary.calculate", () => {
  it("収入総額は収入の項目と昨年からの現金残高の合計、支出総額は収入総額から現金残高を引いた値", () => {
    const summary = FinancialSummary.calculate(aggregation, {
      previousYearBalance: 2_000_000,
      currentYearBalance: 3_000_000,
      liabilityBalance: 0,
    });

    expect(summary).toEqual({ income: 9_500_000, expense: 6_500_000, balance: 3_000_000 });
  });

  it("正味が0以下の収入の項目は収入総額に含めない", () => {
    const summary = FinancialSummary.calculate(
      {
        income: [
          ...aggregation.income,
          { category: "その他の収入", subcategory: "返金", totalAmount: -300_000 },
          { category: "その他の収入", subcategory: "ゼロ", totalAmount: 0 },
        ],
        expense: [],
      },
      { previousYearBalance: 0, currentYearBalance: 1_000_000, liabilityBalance: 0 },
    );

    expect(summary.income).toBe(7_500_000);
  });

  it("昨年からの現金残高が0以下なら収入総額に足さない", () => {
    const summary = FinancialSummary.calculate(aggregation, {
      previousYearBalance: -1_000_000,
      currentYearBalance: 1_000_000,
      liabilityBalance: 0,
    });

    expect(summary.income).toBe(7_500_000);
  });

  it("未払費用が現金を下回るときは、現金残高は現金の額（未払費用を含む）", () => {
    const summary = FinancialSummary.calculate(aggregation, {
      previousYearBalance: 0,
      currentYearBalance: 3_000_000,
      liabilityBalance: 1_000_000,
    });

    expect(summary).toEqual({ income: 7_500_000, expense: 4_500_000, balance: 3_000_000 });
  });

  it("未払費用が現金を上回るときは、現金残高は未払費用の額になる（サンキー図の「現金残高」と同じ）", () => {
    const summary = FinancialSummary.calculate(aggregation, {
      previousYearBalance: 0,
      currentYearBalance: 1_000_000,
      liabilityBalance: 2_500_000,
    });

    expect(summary).toEqual({ income: 7_500_000, expense: 5_000_000, balance: 2_500_000 });
  });

  it("今年の現金残高が0以下なら、未払費用があっても現金残高は0で、支出総額は収入総額と同じ", () => {
    for (const currentYearBalance of [0, -500_000]) {
      const summary = FinancialSummary.calculate(aggregation, {
        previousYearBalance: 0,
        currentYearBalance,
        liabilityBalance: 2_000_000,
      });

      expect(summary).toEqual({ income: 7_500_000, expense: 7_500_000, balance: 0 });
    }
  });
});
