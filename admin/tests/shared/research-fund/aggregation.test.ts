import { aggregateResearchFund, type ResearchFundRow } from "@/shared/research-fund/aggregation";

describe("公開プレビュー用の調研費集計", () => {
  const accounts = { taxi: { label: "タクシー", legalLabel: "交通費" } };
  const expense: ResearchFundRow = {
    date: "2026-02-28",
    accountKey: "taxi",
    amount: 100,
    type: "expense",
  };

  it("空データでも未使用を末尾に返す", () => {
    expect(aggregateResearchFund([], {})).toEqual({
      status: "valid",
      value: {
        categories: [{ key: "unused", label: "未使用", kind: "unused", totalAmount: 0 }],
        monthly: [],
        kpi: { granted: 0, spent: 0 },
        unused: 0,
      },
    });
  });

  it.each([0, 100, 200])("支給額%s円でも未使用を丸めずに差額で返す", (amount) => {
    const result = aggregateResearchFund(
      [expense, { ...expense, accountKey: "grant-income", type: "grant", amount }],
      accounts,
    );
    if (result.status !== "valid") throw new Error("集計失敗");
    expect(result.value.kpi).toEqual({ granted: amount, spent: 100 });
    expect(result.value.unused).toBe(amount - 100);
    expect(result.value.categories.at(-1)).toEqual({
      key: "unused",
      label: "未使用",
      kind: "unused",
      totalAmount: amount - 100,
    });
  });

  it("年をまたぐ月を分離し、入力にない月は未公開扱いのため補完しない", () => {
    const result = aggregateResearchFund(
      [
        { ...expense, date: "2026-01-01" },
        { ...expense, date: "2025-01-31", type: "grant" },
        { ...expense, date: "2024-02-29" },
      ],
      accounts,
    );
    if (result.status !== "valid") throw new Error("集計失敗");
    expect(result.value.monthly).toEqual([
      { month: "2024-02", granted: 0, spent: 100 },
      { month: "2025-01", granted: 100, spent: 0 },
      { month: "2026-01", granted: 0, spent: 100 },
    ]);
  });

  it("同じラベルでも詳細の科目キーを区別し、未使用とも混同しない", () => {
    const category = { label: "未使用", legalLabel: "unused" };
    const result = aggregateResearchFund([{ ...expense, accountKey: "unused" }, expense], {
      unused: category,
      taxi: category,
    });
    if (result.status !== "valid") throw new Error("集計失敗");
    expect(result.value.categories.map(({ key, kind }) => [key, kind])).toEqual([
      ["taxi", "expense"],
      ["unused", "expense"],
      ["unused", "unused"],
    ]);
  });

  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-2-01",
    "invalid",
    "2026-02-01T00:00:00Z",
  ])("不正な日付%sは集計値を返さない", (date) => {
    expect(aggregateResearchFund([{ ...expense, date }], accounts)).toMatchObject({
      status: "invalid",
      errors: [{ path: "rows.0.date", code: "RF_AGGREGATION_INVALID_DATE" }],
    });
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "不正な金額%sは集計値を返さない",
    (amount) => {
      expect(aggregateResearchFund([{ ...expense, amount }], accounts)).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_AGGREGATION_INVALID_AMOUNT" }],
      });
    },
  );

  it.each(["grant", "expense"] as const)("%sの合計が安全な整数範囲を超えたら失敗する", (type) => {
    expect(
      aggregateResearchFund(
        [
          { ...expense, type, amount: Number.MAX_SAFE_INTEGER },
          { ...expense, type },
        ],
        accounts,
      ),
    ).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_AGGREGATION_UNSAFE_TOTAL" }],
    });
  });

  it.each(["missing", "toString", "__proto__"])(
    "対応表にない科目%sを黙って除外しない",
    (accountKey) => {
      expect(aggregateResearchFund([{ ...expense, accountKey }], accounts)).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_AGGREGATION_MISSING_CATEGORY" }],
      });
    },
  );

  it("法定区分の欠落と未知の支給/支出区分を検出する", () => {
    expect(
      aggregateResearchFund(
        [expense],
        {
          taxi: { label: "タクシー", legalLabel: "" },
        },
        "legal",
      ),
    ).toMatchObject({ status: "invalid" });
    expect(
      aggregateResearchFund([{ ...expense, type: "refund" as ResearchFundRow["type"] }], accounts),
    ).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_AGGREGATION_INVALID_TYPE" }],
    });
  });
});
