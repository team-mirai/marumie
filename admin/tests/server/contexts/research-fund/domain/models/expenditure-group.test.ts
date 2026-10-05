import {
  assertValidIds,
  type LinkableEntry,
  normalizePolicyComment,
  validateEntryLinks,
  validateGroupOrder,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";

function entry(id: string, groupId: string | null = null): LinkableEntry {
  return { id, entryDate: "2026-05-14", description: `明細${id}`, amount: 3000, groupId };
}

describe("validateEntryLinks", () => {
  test("未所属の仕訳と自分に紐づいた仕訳は紐づけられ、重複は入力順を保って除く", () => {
    const entries = [entry("10"), entry("11", "1"), entry("12")];
    expect(validateEntryLinks("1", ["12", "11", "12", "10"], entries)).toEqual({
      status: "valid",
      value: ["12", "11", "10"],
    });
  });

  test("新規の支出群には未所属の仕訳だけを紐づけられる", () => {
    expect(validateEntryLinks(null, ["10"], [entry("10")])).toMatchObject({ status: "valid" });
    expect(validateEntryLinks(null, ["10"], [entry("10", "1")])).toMatchObject({
      status: "invalid",
      errors: [{ message: "他の支出群に紐づいている仕訳は選べません" }],
    });
  });

  test("他の支出群に紐づいた仕訳は選べない（公開側で金額が二重計上されるため）", () => {
    expect(validateEntryLinks("1", ["10"], [entry("10", "2")])).toMatchObject({
      status: "invalid",
      errors: [{ path: "entryIds", message: "他の支出群に紐づいている仕訳は選べません" }],
    });
  });

  test("この帳簿にない仕訳は紐づけられない", () => {
    expect(validateEntryLinks("1", ["99"], [entry("10")])).toMatchObject({
      status: "invalid",
      errors: [{ path: "entryIds", message: "この帳簿にない仕訳は紐づけられません" }],
    });
  });

  test("紐づけ無しは常に受け付ける", () => {
    expect(validateEntryLinks("1", [], [])).toEqual({ status: "valid", value: [] });
  });
});

describe("normalizePolicyComment", () => {
  test("前後の空白を落とす", () => {
    expect(normalizePolicyComment("  調査ツールに重点  ")).toEqual({
      status: "valid",
      value: "調査ツールに重点",
    });
  });

  test("2000文字までは受け付け、超えたら却下する", () => {
    expect(normalizePolicyComment("あ".repeat(2000))).toMatchObject({ status: "valid" });
    expect(normalizePolicyComment("あ".repeat(2001))).toMatchObject({
      status: "invalid",
      errors: [{ message: "活用方針は2000文字以内で入力してください" }],
    });
  });

  test.each([null, 1, undefined])("文字列でなければ却下する: %j", (value) => {
    expect(normalizePolicyComment(value)).toMatchObject({
      status: "invalid",
      errors: [{ message: "活用方針の入力が不正です" }],
    });
  });
});

describe("validateGroupOrder", () => {
  test("重複の無い並びはそのまま受け付ける", () => {
    expect(validateGroupOrder(["2", "1"])).toEqual({ status: "valid", value: ["2", "1"] });
    expect(validateGroupOrder([])).toEqual({ status: "valid", value: [] });
  });

  test("同じ支出群が2回出てくる並びは却下する", () => {
    expect(validateGroupOrder(["1", "2", "1"])).toMatchObject({
      status: "invalid",
      errors: [{ message: "並び順の指定が重複しています" }],
    });
  });
});

describe("assertValidIds", () => {
  test("1 以上の整数の形なら通す", () => {
    expect(() => assertValidIds("1", "30")).not.toThrow();
  });

  test.each(["", "0", "-1", "abc", "01"])("それ以外は投げる: %j", (id) => {
    expect(() => assertValidIds("1", id)).toThrow("IDが不正です");
  });
});
