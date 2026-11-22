import type { MonthlyAccountTotal } from "@/server/contexts/public-finance/domain/models/monthly-account-total";
import { aggregateFromAccountTotals } from "@/server/contexts/public-finance/domain/services/monthly-net-aggregator";
import { buildNetCategoryAggregation } from "@/server/contexts/public-finance/domain/services/net-category-aggregator";

const total = (month: number, account: string, amount: number, year = 2025): MonthlyAccountTotal => ({
  year,
  month,
  account,
  amount,
});

const sum = (items: { totalAmount: number }[]) =>
  items.reduce((acc, item) => acc + item.totalAmount, 0);

describe("aggregateFromAccountTotals", () => {
  it("会計年度の全12ヶ月分を yearMonth の昇順で返し、データがない月は収支0にする", () => {
    const result = aggregateFromAccountTotals(
      [total(3, "個人からの寄附", 1000)],
      [total(3, "事務所費", 400)],
      2025,
    );

    expect(result).toHaveLength(12);
    expect(result.map((r) => r.yearMonth)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`),
    );
    expect(result[2]).toEqual({ yearMonth: "2025-03", income: 1000, expense: 400 });
    expect(result[0]).toEqual({ yearMonth: "2025-01", income: 0, expense: 0 });
  });

  it("収入科目は貸方を足して借方（返金）を差し引き、支出科目は借方を足して貸方（返金）を差し引く", () => {
    const result = aggregateFromAccountTotals(
      [total(1, "個人からの寄附", 1000), total(1, "事務所費", 50)],
      [total(1, "個人からの寄附", 200), total(1, "事務所費", 300)],
      2025,
    );

    expect(result[0]).toEqual({ yearMonth: "2025-01", income: 800, expense: 250 });
  });

  it("借方の借入金（返済）は収入から差し引かず支出に数える", () => {
    const result = aggregateFromAccountTotals(
      [total(1, "借入金", 1000)],
      [total(1, "借入金", 300)],
      2025,
    );

    expect(result[0]).toEqual({ yearMonth: "2025-01", income: 1000, expense: 300 });
  });

  it("BS科目は収入・支出に数えない", () => {
    const result = aggregateFromAccountTotals(
      [total(1, "普通預金", 1000)],
      [total(1, "普通預金", 500)],
      2025,
    );

    expect(result[0]).toEqual({ yearMonth: "2025-01", income: 0, expense: 0 });
  });

  it("科目マスタに無い科目は、サンキー図と同じく貸方なら収入・借方なら支出に数える", () => {
    const result = aggregateFromAccountTotals(
      [total(1, "マスタに無い収入", 700)],
      [total(1, "マスタに無い支出", 200)],
      2025,
    );

    expect(result[0]).toEqual({ yearMonth: "2025-01", income: 700, expense: 200 });
  });

  it("会計年度外の月のデータは含めない", () => {
    const result = aggregateFromAccountTotals(
      [total(12, "個人からの寄附", 1000, 2024), total(1, "個人からの寄附", 500)],
      [],
      2025,
    );

    expect(result.find((r) => r.yearMonth === "2024-12")).toBeUndefined();
    expect(result[0].income).toBe(500);
    expect(result[11].income).toBe(0);
  });

  it("科目マスタに無い科目を含むデータで、月次の合計がサンキー図の年間の合計と一致する", () => {
    const creditTotals = [
      total(1, "個人からの寄附", 1000),
      total(1, "マスタに無い科目", 300),
      total(2, "事務所費", 80),
      total(2, "普通預金", 5000),
      total(4, "借入金", 2000),
      total(4, "", 10),
    ];
    const debitTotals = [
      total(1, "事務所費", 400),
      total(2, "マスタに無い科目", 120),
      total(2, "個人からの寄附", 100),
      total(3, "普通預金", 900),
      total(4, "借入金", 500),
    ];

    const monthly = aggregateFromAccountTotals(creditTotals, debitTotals, 2025);
    const yearly = buildNetCategoryAggregation(creditTotals, debitTotals);

    const monthlyIncome = monthly.reduce((acc, m) => acc + m.income, 0);
    const monthlyExpense = monthly.reduce((acc, m) => acc + m.expense, 0);
    expect(monthlyIncome).toBe(sum(yearly.income));
    expect(monthlyExpense).toBe(sum(yearly.expense));
    // 科目マスタに無い科目も数えている（落とすと合計がずれる）
    expect(monthlyIncome).toBe(1000 + 300 - 100 + 2000 + 10);
    expect(monthlyExpense).toBe(400 - 80 + 120 + 500);
  });
});
