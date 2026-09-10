import { aggregateResearchFund, type ResearchFundRow } from "@/shared/research-fund/aggregation";

describe("公開ページ用の調研費集計", () => {
  const accounts = {
    taxi: { label: "タクシー", legalLabel: "交通費" },
    train: { label: "鉄道", legalLabel: "交通費" },
    books: { label: "書籍", legalLabel: "資料購入費" },
    zero: { label: "利用なし", legalLabel: "利用なし" },
  };
  const rows: ResearchFundRow[] = [
    { date: "2026-03-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
    { date: "2026-02-28", accountKey: "taxi", amount: 3_000, type: "expense" },
    { date: "2026-02-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
    { date: "2026-03-31", accountKey: "train", amount: 2_000, type: "expense" },
    { date: "2026-02-28", accountKey: "taxi", amount: 1_000, type: "expense" },
    { date: "2026-03-15", accountKey: "books", amount: 4_000, type: "expense" },
    { date: "2026-03-15", accountKey: "zero", amount: 0, type: "expense" },
  ];

  it("費目別合計・末尾の未使用・月次・KPIが同じ行から得られる", () => {
    expect(aggregateResearchFund(rows, accounts)).toEqual({
      status: "valid",
      value: {
        categories: [
          { key: "books", label: "書籍", kind: "expense", totalAmount: 4_000 },
          { key: "taxi", label: "タクシー", kind: "expense", totalAmount: 4_000 },
          { key: "train", label: "鉄道", kind: "expense", totalAmount: 2_000 },
          { key: "unused", label: "未使用", kind: "unused", totalAmount: 1_990_000 },
        ],
        monthly: [
          { month: "2026-02", granted: 1_000_000, spent: 4_000 },
          { month: "2026-03", granted: 1_000_000, spent: 6_000 },
        ],
        kpi: { granted: 2_000_000, spent: 10_000 },
        unused: 1_990_000,
      },
    });
  });

  it("法定区分では対応表に従って統合し、KPIと月次は変えない", () => {
    const detailed = aggregateResearchFund(rows, accounts);
    const legal = aggregateResearchFund(rows, accounts, "legal");
    if (detailed.status !== "valid" || legal.status !== "valid") throw new Error("集計失敗");
    expect(legal.value.categories).toEqual([
      { key: "交通費", label: "交通費", kind: "expense", totalAmount: 6_000 },
      { key: "資料購入費", label: "資料購入費", kind: "expense", totalAmount: 4_000 },
      { key: "unused", label: "未使用", kind: "unused", totalAmount: 1_990_000 },
    ]);
    expect(legal.value.kpi).toEqual(detailed.value.kpi);
    expect(legal.value.monthly).toEqual(detailed.value.monthly);
    expect(legal.value.unused).toEqual(detailed.value.unused);
  });

  it("21科目をハードコードせず、呼び出し側の法定区分対応を使う", () => {
    const master = Object.fromEntries(
      Array.from({ length: 21 }, (_, i) => [
        `account-${i}`,
        { label: `科目${i}`, legalLabel: `区分${i % 3}` },
      ]),
    );
    const expenses: ResearchFundRow[] = Object.keys(master).map((accountKey) => ({
      date: "2026-02-01",
      accountKey,
      amount: 100,
      type: "expense",
    }));
    const detailed = aggregateResearchFund(expenses, master);
    const legal = aggregateResearchFund(expenses, master, "legal");
    if (detailed.status !== "valid" || legal.status !== "valid") throw new Error("集計失敗");
    expect(detailed.value.categories.filter((item) => item.kind === "expense")).toHaveLength(21);
    expect(legal.value.categories.filter((item) => item.kind === "expense")).toEqual(
      [0, 1, 2].map((i) => ({
        key: `区分${i}`,
        label: `区分${i}`,
        kind: "expense",
        totalAmount: 700,
      })),
    );
  });

  it("入力順が変わっても同じ結果になり、凍結した入力を変更しない", () => {
    const frozen = Object.freeze(rows.map((row) => Object.freeze({ ...row })));
    const frozenAccounts = Object.freeze(
      Object.fromEntries(
        Object.entries(accounts).map(([key, category]) => [key, Object.freeze({ ...category })]),
      ),
    );
    expect(aggregateResearchFund(frozen, frozenAccounts)).toEqual(
      aggregateResearchFund([...rows].reverse(), accounts),
    );
  });
});
