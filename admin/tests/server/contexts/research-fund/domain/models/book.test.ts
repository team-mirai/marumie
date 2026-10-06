import { Book } from "@/server/contexts/research-fund/domain/models/book";

describe("normalizePolicyComment", () => {
  test("前後の空白を落とす", () => {
    expect(Book.normalizePolicyComment("  調査ツールに重点  ")).toEqual({
      status: "valid",
      value: "調査ツールに重点",
    });
  });

  test("2000文字までは受け付け、超えたら却下する", () => {
    expect(Book.normalizePolicyComment("あ".repeat(2000))).toMatchObject({ status: "valid" });
    expect(Book.normalizePolicyComment("あ".repeat(2001))).toMatchObject({
      status: "invalid",
      errors: [{ path: "policyComment", message: "活用方針は2000文字以内で入力してください" }],
    });
  });

  test.each([null, 1, undefined])("文字列でなければ却下する: %j", (value) => {
    expect(Book.normalizePolicyComment(value)).toMatchObject({
      status: "invalid",
      errors: [{ message: "活用方針の入力が不正です" }],
    });
  });
});

describe("validateMetadata", () => {
  const metadata = { asOfDate: "2026-08-20", nextUpdateNote: "11月ごろ", policyComment: "方針" };

  test("活用方針は前後の空白を落として返す", () => {
    expect(Book.validateMetadata({ ...metadata, policyComment: "  方針  " })).toEqual({
      status: "valid",
      value: metadata,
    });
  });

  test("活用方針は2000文字までで、超えたら支出群の画面と同じメッセージで却下する", () => {
    expect(
      Book.validateMetadata({ ...metadata, policyComment: `  ${"あ".repeat(2000)}  ` }),
    ).toMatchObject({ status: "valid" });
    expect(Book.validateMetadata({ ...metadata, policyComment: "あ".repeat(2001) })).toMatchObject({
      status: "invalid",
      errors: [{ path: "policyComment", message: "活用方針は2000文字以内で入力してください" }],
    });
  });
});
