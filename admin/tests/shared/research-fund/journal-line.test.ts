import {
  BANK_ACCOUNT_KEY,
  CASH_ACCOUNT_KEY,
  entryAmountOf,
  EXPENSE_LINE,
  expenseAmountOf,
  expenseLinesOf,
  GRANT_INCOME_ACCOUNT_KEY,
  GRANT_LINE,
  grantAmountOf,
  journalLineType,
  researchFundRowsOf,
  twoLineAmountLineOf,
} from "@/shared/research-fund/journal-line";

type Side = "debit" | "credit";
function line(side: Side, accountKey: string, type: string, amount: number) {
  return { side, accountKey, account: { type }, amount };
}
const taxi = (side: Side, amount: number) => line(side, "taxi", "expense", amount);
const bank = (side: Side, amount: number) => line(side, BANK_ACCOUNT_KEY, "asset", amount);
const cash = (side: Side, amount: number) => line(side, CASH_ACCOUNT_KEY, "asset", amount);
const grantIncome = (side: Side, amount: number) =>
  line(side, GRANT_INCOME_ACCOUNT_KEY, "income", amount);

/** 現在の仕訳の作り方（JournalPosting.generate）で作られる形 */
const expenseEntry = [taxi("debit", 1500), bank("credit", 1500)];
const grantEntry = [bank("debit", 1_000_000), grantIncome("credit", 1_000_000)];

describe("仕訳の行の読み取り", () => {
  it("科目のキーは科目マスタのキーと同じ", () => {
    expect([BANK_ACCOUNT_KEY, CASH_ACCOUNT_KEY, GRANT_INCOME_ACCOUNT_KEY]).toEqual([
      "bank",
      "cash",
      "grant-income",
    ]);
  });

  it("支出は費用科目の借方、支給は調査研究費収入の貸方で、DB の絞り込みと同じ条件を持つ", () => {
    expect(EXPENSE_LINE).toEqual({ side: "debit", account: { type: "expense" } });
    expect(GRANT_LINE).toEqual({ side: "credit", accountKey: "grant-income" });
  });

  it.each([
    ["費用の借方", taxi("debit", 1), "expense"],
    ["調査研究費収入の貸方", grantIncome("credit", 1), "grant"],
    ["相手勘定の普通預金（貸方）", bank("credit", 1), null],
    ["相手勘定の普通預金（借方）", bank("debit", 1), null],
    ["相手勘定の現金", cash("credit", 1), null],
    ["費用の貸方（取り消しの形）", taxi("credit", 1), null],
    ["調査研究費収入の借方（返還の形）", grantIncome("debit", 1), null],
  ] as const)("%s は %s", (_, target, expected) => {
    expect(journalLineType(target)).toBe(expected);
  });

  it("支出の金額は費用の借方の合計（相手勘定の科目を問わない）", () => {
    expect(expenseAmountOf(expenseEntry)).toBe(1500);
    expect(expenseAmountOf([taxi("debit", 1200), cash("credit", 1200)])).toBe(1200);
    const split = [
      taxi("debit", 500),
      line("debit", "books-newspapers", "expense", 700),
      bank("credit", 1200),
    ];
    expect(expenseAmountOf(split)).toBe(1200);
    expect(expenseLinesOf(split).map((l) => l.accountKey)).toEqual(["taxi", "books-newspapers"]);
    expect(expenseAmountOf(grantEntry)).toBe(0);
  });

  it("支給の金額は調査研究費収入の貸方の合計", () => {
    expect(grantAmountOf(grantEntry)).toBe(1_000_000);
    expect(grantAmountOf(expenseEntry)).toBe(0);
  });

  it("仕訳全体の金額は借方の合計", () => {
    expect(entryAmountOf(expenseEntry)).toBe(1500);
    expect(entryAmountOf(grantEntry)).toBe(1_000_000);
  });

  it("DB の Decimal（toNumber を持つ）の金額も読める", () => {
    const decimal = (value: number) => ({ toNumber: () => value });
    expect(
      expenseAmountOf([
        { ...taxi("debit", 0), amount: decimal(800) },
        { ...bank("credit", 0), amount: decimal(800) },
      ]),
    ).toBe(800);
  });
});

describe("集計の行への読み替え", () => {
  const override = { key: "research", label: "⑦ 調査研究費" };

  it("支出の行と支給の行を 1 行ずつ集計の行にし、相手勘定は数えない", () => {
    expect(
      researchFundRowsOf({ date: "2026-08-13", lines: expenseEntry, legalCategoryOverride: null }),
    ).toEqual([
      {
        line: expenseEntry[0],
        row: { date: "2026-08-13", accountKey: "taxi", amount: 1500, type: "expense" },
      },
    ]);
    expect(
      researchFundRowsOf({ date: "2026-09-01", lines: grantEntry, legalCategoryOverride: null }),
    ).toEqual([
      {
        line: grantEntry[1],
        row: { date: "2026-09-01", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
      },
    ]);
  });

  it("法定区分の上書きは支出の行にだけ添える", () => {
    const rows = researchFundRowsOf({
      date: "2026-08-13",
      lines: [...expenseEntry, ...grantEntry],
      legalCategoryOverride: override,
    }).map(({ row }) => row);
    expect(rows).toEqual([
      { date: "2026-08-13", accountKey: "taxi", amount: 1500, type: "expense", legalCategoryOverride: override },
      { date: "2026-08-13", accountKey: "grant-income", amount: 1_000_000, type: "grant" },
    ]);
  });

  it("費用の借方が複数ある仕訳は、それぞれを集計の行にする", () => {
    const rows = researchFundRowsOf({
      date: "2026-08-13",
      lines: [taxi("debit", 500), line("debit", "books-newspapers", "expense", 700), bank("credit", 1200)],
      legalCategoryOverride: null,
    }).map(({ row }) => [row.accountKey, row.amount]);
    expect(rows).toEqual([
      ["taxi", 500],
      ["books-newspapers", 700],
    ]);
  });
});

describe("確認画面のフォームで扱える 2 行の仕訳", () => {
  it("支出は費用の借方と普通預金の貸方の 2 行なら、費用の行を返す", () => {
    expect(twoLineAmountLineOf(expenseEntry, "expense")).toBe(expenseEntry[0]);
  });

  it("支給は普通預金の借方と調査研究費収入の貸方の 2 行なら、収入の行を返す", () => {
    expect(twoLineAmountLineOf(grantEntry, "grant")).toBe(grantEntry[1]);
  });

  it.each([
    ["現金払い", [taxi("debit", 1200), cash("credit", 1200)]],
    ["費用の借方が複数", [taxi("debit", 500), taxi("debit", 700), bank("credit", 1200)]],
    ["貸借不一致", [taxi("debit", 1200), bank("credit", 500)]],
    ["普通預金が借方", [taxi("debit", 1200), bank("debit", 1200)]],
  ])("%s の支出は扱わない", (_, lines) => {
    expect(twoLineAmountLineOf(lines, "expense")).toBeNull();
  });

  it("支給の形を支出として、支出の形を支給としては読まない", () => {
    expect(twoLineAmountLineOf(grantEntry, "expense")).toBeNull();
    expect(twoLineAmountLineOf(expenseEntry, "grant")).toBeNull();
  });
});
