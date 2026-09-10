import {
  JournalPosting,
  type JournalLine,
  type ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";

const expense: ResearchFundAccount = { key: "taxi", type: "expense" };
const bank: ResearchFundAccount = { key: "bank", type: "asset" };
const cash: ResearchFundAccount = { key: "cash", type: "asset" };
const income: ResearchFundAccount = { key: "grant-income", type: "income" };
const expenseInput = {
  pattern: "expense" as const,
  source: "scan" as const,
  amount: 1200,
  account: expense,
  assetAccount: bank,
};

function expectInvalid(result: ReturnType<typeof JournalPosting.generate>, code: string) {
  expect(result).toEqual({
    status: "invalid",
    errors: [
      expect.objectContaining({
        code,
        path: expect.any(String),
        message: expect.any(String),
        severity: "error",
      }),
    ],
  });
}

describe("JournalPosting", () => {
  it.each(["scan", "manual"] as const)("%s の支出は費用 / 資産を生成する", (source) => {
    for (const assetAccount of [bank, cash]) {
      const result = JournalPosting.generate({ ...expenseInput, source, assetAccount });
      expect(result).toEqual({
        status: "valid",
        value: {
          lines: [
            { side: "debit", accountKey: "taxi", amount: 1200 },
            { side: "credit", accountKey: assetAccount.key, amount: 1200 },
          ],
        },
      });
    }
  });

  it.each([
    ["grant", "grant", "bank", "grant-income"],
    ["refund", "manual", "grant-income", "bank"],
  ] as const)("%s の借方と貸方を生成する", (pattern, source, debitKey, creditKey) => {
    const input =
      pattern === "grant"
        ? {
            pattern,
            source: "grant" as const,
            amount: 1_000_000,
            account: income,
            assetAccount: bank,
          }
        : {
            pattern,
            source: "manual" as const,
            amount: 1_000_000,
            account: income,
            assetAccount: bank,
          };
    expect(input.source).toBe(source);
    expect(JournalPosting.generate(input)).toEqual({
      status: "valid",
      value: {
        lines: [
          { side: "debit", accountKey: debitKey, amount: 1_000_000 },
          { side: "credit", accountKey: creditKey, amount: 1_000_000 },
        ],
      },
    });
  });

  it.each([1, 999_999_999_999])("境界金額 %s の生成結果は貸借一致する", (amount) => {
    const result = JournalPosting.generate({ ...expenseInput, amount });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("生成失敗");
    expect(JournalPosting.validate(result.value.lines)).toEqual(result);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.lines)).toBe(true);
    expect(Object.isFrozen(result.value.lines[0])).toBe(true);
  });

  it.each([0, -1, 0.5, NaN, Infinity, -Infinity, 1_000_000_000_000, Number.MAX_SAFE_INTEGER + 1])(
    "不正な金額 %s を拒否する",
    (amount) => {
      expectInvalid(JournalPosting.generate({ ...expenseInput, amount }), "RF_INVALID_AMOUNT");
      expectInvalid(
        JournalPosting.validate([
          { side: "debit", accountKey: "taxi", amount },
          { side: "credit", accountKey: "bank", amount },
        ]),
        "RF_INVALID_AMOUNT",
      );
    },
  );

  it.each([
    bank,
    income,
    { key: " ", type: "expense" },
    { key: "bank", type: "expense" },
  ] satisfies ResearchFundAccount[])("不正な支出科目 %j を拒否する", (account) => {
    expectInvalid(JournalPosting.generate({ ...expenseInput, account }), "RF_INVALID_ACCOUNT");
  });

  it.each([
    expense,
    { key: "bank", type: "income" },
    { key: "other", type: "asset" },
  ] satisfies ResearchFundAccount[])("不正な決済科目 %j を拒否する", (assetAccount) => {
    expectInvalid(JournalPosting.generate({ ...expenseInput, assetAccount }), "RF_INVALID_ACCOUNT");
  });

  it("支給・返還では調査研究費収入と普通預金だけを許す", () => {
    for (const pattern of ["grant", "refund"] as const) {
      const input =
        pattern === "grant"
          ? { pattern, source: "grant" as const, amount: 1000, account: income, assetAccount: bank }
          : {
              pattern,
              source: "manual" as const,
              amount: 1000,
              account: income,
              assetAccount: bank,
            };
      expectInvalid(
        JournalPosting.generate({ ...input, assetAccount: cash }),
        "RF_INVALID_ACCOUNT",
      );
      for (const account of [expense, bank, { key: "other-income", type: "income" as const }]) {
        expectInvalid(JournalPosting.generate({ ...input, account }), "RF_INVALID_ACCOUNT");
      }
    }
  });

  it.each([
    { pattern: "unknown", source: "manual" },
    { pattern: "expense", source: "grant" },
    { pattern: "grant", source: "scan" },
    { pattern: "refund", source: "grant" },
  ])("型の外から渡る不正パターン %j を拒否する", (invalid) => {
    const input = { ...expenseInput, ...invalid } as Parameters<typeof JournalPosting.generate>[0];
    expectInvalid(JournalPosting.generate(input), "RF_INVALID_PATTERN");
  });

  it("複数行の貸借を検証し、入力の変更から検証済みの行を保護する", () => {
    const lines: JournalLine[] = [
      { side: "debit", accountKey: "taxi", amount: 100 },
      { side: "debit", accountKey: "lodging", amount: 200 },
      { side: "credit", accountKey: "bank", amount: 300 },
    ];
    const result = JournalPosting.validate(lines);
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("検証失敗");
    lines[0] = { side: "debit", accountKey: "taxi", amount: 999 };
    lines.pop();
    expect(result.value.lines).toHaveLength(3);
    expect(result.value.lines[0].amount).toBe(100);
  });

  it("貸借不一致と片側しかない仕訳を拒否する", () => {
    expectInvalid(
      JournalPosting.validate([
        { side: "debit", accountKey: "taxi", amount: 100 },
        { side: "credit", accountKey: "bank", amount: 99 },
      ]),
      "RF_UNBALANCED_POSTING",
    );
    expectInvalid(
      JournalPosting.validate([
        { side: "debit", accountKey: "taxi", amount: 100 },
        { side: "debit", accountKey: "lodging", amount: 100 },
      ]),
      "RF_UNBALANCED_POSTING",
    );
  });

  it("空・単一行・不正なside・科目なしを拒否する", () => {
    const debit: JournalLine = { side: "debit", accountKey: "taxi", amount: 1 };
    expectInvalid(JournalPosting.validate([]), "RF_INVALID_LINES");
    expectInvalid(JournalPosting.validate([debit]), "RF_INVALID_LINES");
    expectInvalid(
      JournalPosting.validate([debit, { ...debit, side: "invalid" as JournalLine["side"] }]),
      "RF_INVALID_LINES",
    );
    expectInvalid(
      JournalPosting.validate([debit, { side: "credit", accountKey: " ", amount: 1 }]),
      "RF_INVALID_ACCOUNT",
    );
  });
});
