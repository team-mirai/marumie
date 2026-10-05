import {
  ADVANCED_BY_MAX_LENGTH,
  inheritedAdvancedBy,
  normalizeAdvancedBy,
  settlementRejection,
  summarizeUnsettledAdvances,
  todayInJst,
  validateAdvancedBy,
  validateSettlementDate,
  type AdvanceEntry,
} from "@/server/contexts/research-fund/domain/models/advance";

const entry: AdvanceEntry = { id: "1", description: "タクシー代", entryDate: "2026-08-01", amount: 1200, status: "approved", advancedBy: "秘書A", settledAt: null };

describe("normalizeAdvancedBy", () => {
  it.each(["  秘書A  ", "\t秘書A\n", "　秘書A　", "秘書A"])("前後の空白（全角を含む）を落とす %j", value => {
    expect(normalizeAdvancedBy(value)).toBe("秘書A");
  });
  it.each(["", " ", "　", "  　\t"])("空白だけなら立替なし（null）として扱う %j", value => {
    expect(normalizeAdvancedBy(value)).toBeNull();
  });
  it("姓名の間の空白は利用者の入力のまま残す", () => {
    expect(normalizeAdvancedBy(" 山田 太郎 ")).toBe("山田 太郎");
  });
});

describe("validateAdvancedBy", () => {
  it("上限文字数までは受け付け、正規化した値を返す", () => {
    expect(validateAdvancedBy(` ${"あ".repeat(ADVANCED_BY_MAX_LENGTH)} `)).toEqual({ status: "valid", value: "あ".repeat(ADVANCED_BY_MAX_LENGTH) });
  });
  it("上限を超えたら受け付けない", () => {
    const result = validateAdvancedBy("あ".repeat(ADVANCED_BY_MAX_LENGTH + 1));
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[0].message).toContain(`${ADVANCED_BY_MAX_LENGTH}文字以内`);
  });
  it("空白だけなら立替の解除として受け付ける", () => {
    expect(validateAdvancedBy("　")).toEqual({ status: "valid", value: null });
  });
});

describe("settlementRejection", () => {
  it.each(["approved", "published"] as const)("%s の未精算の立替は精算できる", status => {
    expect(settlementRejection({ ...entry, status })).toBeNull();
  });
  it("下書きは金額が確定していないので精算できない", () => {
    expect(settlementRejection({ ...entry, status: "draft" })).toContain("下書き");
  });
  it("立替でない支出は精算できない", () => {
    expect(settlementRejection({ ...entry, advancedBy: null })).toContain("立替ではありません");
  });
  it("すでに精算済なら精算できない", () => {
    expect(settlementRejection({ ...entry, settledAt: "2026-09-01" })).toContain("精算済");
  });
});

describe("validateSettlementDate", () => {
  it("今日までの日付で、仕訳の日付以降なら受け付ける", () => {
    expect(validateSettlementDate("2026-09-10", ["2026-08-01", "2026-09-10"], "2026-10-05")).toEqual({ status: "valid", value: "2026-09-10" });
  });
  it("年度をまたぐ精算（3月分を4月に精算）も受け付ける", () => {
    expect(validateSettlementDate("2027-04-10", ["2027-03-28"], "2027-05-01").status).toBe("valid");
  });
  it("未来日は受け付けない", () => {
    const result = validateSettlementDate("2026-10-06", ["2026-08-01"], "2026-10-05");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[0].message).toContain("未来");
  });
  it("選んだ仕訳のうち最も新しい日付より前は受け付けない", () => {
    const result = validateSettlementDate("2026-08-15", ["2026-08-01", "2026-08-20"], "2026-10-05");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[0].message).toContain("2026-08-20");
  });
  it.each(["", "2026/09/01", "きのう"])("日付として読めない値は受け付けない %j", value => {
    expect(validateSettlementDate(value, ["2026-08-01"], "2026-10-05").status).toBe("invalid");
  });
  it("カレンダー上に存在しない日付は受け付けない（翌月に繰り上げて保存しない）", () => {
    // 仕訳の日付以降・今日以前なので、境界の判定だけでは通ってしまう値
    const result = validateSettlementDate("2026-02-30", ["2026-02-28"], "2026-03-05");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[0].message).toContain("正しく入力");
  });
});

describe("summarizeUnsettledAdvances", () => {
  it("立替者ごとに未精算の件数と合計額を数え、合計額の多い順に並べる", () => {
    expect(summarizeUnsettledAdvances([
      { ...entry, id: "1", advancedBy: "秘書A", amount: 1200 },
      { ...entry, id: "2", advancedBy: "秘書A", amount: 800 },
      { ...entry, id: "3", advancedBy: "秘書B", amount: 5000 },
    ])).toEqual([
      { advancedBy: "秘書B", count: 1, total: 5000 },
      { advancedBy: "秘書A", count: 2, total: 2000 },
    ]);
  });
  it("立替でない支出と精算済は数えない", () => {
    expect(summarizeUnsettledAdvances([
      { ...entry, id: "1", advancedBy: null },
      { ...entry, id: "2", settledAt: "2026-09-01" },
    ])).toEqual([]);
  });
});

describe("inheritedAdvancedBy", () => {
  it("立替者が1種類だけなら引き継ぐ", () => {
    expect(inheritedAdvancedBy(["秘書A", "秘書A"])).toEqual({ advancedBy: "秘書A", mixed: false });
  });
  it("複数の立替者が混ざっていたら引き継がず、混在として知らせる", () => {
    expect(inheritedAdvancedBy(["秘書A", "秘書B"])).toEqual({ advancedBy: null, mixed: true });
  });
  it("立替なしが混ざっていたら引き継がない（立替でない支出に立替者を付けないため）", () => {
    expect(inheritedAdvancedBy(["秘書A", null])).toEqual({ advancedBy: null, mixed: true });
  });
  it.each([[[]], [[null]], [[null, null]]])("立替者が1件も無ければ引き継ぐものが無いだけで混在ではない %j", values => {
    expect(inheritedAdvancedBy(values)).toEqual({ advancedBy: null, mixed: false });
  });
});

describe("todayInJst", () => {
  it("日本時間の日付を返す（UTC では前日でも日本の今日を使う）", () => {
    expect(todayInJst(new Date("2026-10-05T23:00:00.000Z"))).toBe("2026-10-06");
    expect(todayInJst(new Date("2026-10-05T14:59:00.000Z"))).toBe("2026-10-05");
  });
});
