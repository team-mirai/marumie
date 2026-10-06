import { PROMPT_BODY_MAX_LENGTH, PromptHistory, normalizePromptBody, summarizePromptChange, validatePromptOwnerId, validatePromptVersion } from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRecord } from "@/server/contexts/research-fund/domain/models/prompt";
test.each(["", "   \n\t ", null, undefined, 42, {}])("空・非文字列の本文は保存できない: %j", (body) => {
  expect(() => normalizePromptBody(body)).toThrow("プロンプト本文");
});
test("前後の空白だけを落とし、本文中の改行とインデントは保つ", () => {
  expect(normalizePromptBody("\n  一行目\n  - 項目\n\n")).toBe("一行目\n  - 項目");
});
test("上限を超える本文は保存できない", () => {
  expect(normalizePromptBody("あ".repeat(PROMPT_BODY_MAX_LENGTH))).toHaveLength(PROMPT_BODY_MAX_LENGTH);
  expect(() => normalizePromptBody("あ".repeat(PROMPT_BODY_MAX_LENGTH + 1))).toThrow("文字以内");
});
test("前版が無ければ初版", () => {
  expect(summarizePromptChange("本文", null)).toBe("初版");
});
test.each([
  ["a\nb", "a\nb", "本文の変更なし"],
  ["a\nb", "b\na", "行の並び替え"],
  ["a\nb\nc", "a\nb", "+1行"],
  ["a", "a\nb\nc", "−2行"],
  ["a\nx", "a\nb\nc", "+1行・−2行"],
  ["a\na", "a", "+1行"],
  ["a", "a\na", "−1行"],
  ["a\n\nb", "a\nb", "+1行"],
])("前版との行差分を変更要旨にする: %j", (body, previous, expected) => {
  expect(summarizePromptChange(body, previous)).toBe(expected);
});
test.each(["", "0", "-1", "abc", "1.5"])("不正な議員IDは受け付けない: %j", (id) => {
  expect(() => validatePromptOwnerId(id)).toThrow("IDが不正です");
});
test("正の整数の議員IDは受け付ける", () => {
  expect(() => validatePromptOwnerId("12")).not.toThrow();
});
test.each([0, -1, 1.5, NaN, "1", null])("不正な版の指定は受け付けない: %j", (version) => {
  expect(() => validatePromptVersion(version)).toThrow("版の指定が不正です");
});
test("1以上の整数の版はそのまま返す", () => {
  expect(validatePromptVersion(3)).toBe(3);
});

describe("PromptHistory", () => {
  function record(version: number, body: string, isActive = false): PromptRecord {
    return { id: String(version), version, body, isActive, updatedAt: "2026-09-01T00:00:00.000Z", jobCount: version };
  }
  it("有効版を編集対象にし、各版の変更要旨を前版との差分から導出する", () => {
    const history = PromptHistory.fromRecords([record(3, "a\nb\nc"), record(2, "a\nb", true), record(1, "a")]);
    expect(history.active?.version).toBe(2);
    expect(history.versions.map((version) => version.summary)).toEqual(["+1行", "+1行", "初版"]);
    expect(history.overview("初期テンプレート")).toEqual({
      versions: history.versions, body: "a\nb", activeVersion: 2, nextVersion: 4,
    });
  });
  it("有効版が無ければ最新版を編集対象にする", () => {
    const history = PromptHistory.fromRecords([record(2, "新"), record(1, "旧")]);
    expect(history.active?.version).toBe(2);
    expect(history.overview("初期テンプレート")).toMatchObject({ body: "新", activeVersion: 2, nextVersion: 3 });
  });
  it("巻き戻し後も有効版を編集対象にし、次の版は最新版の続き番号になる", () => {
    const history = PromptHistory.fromRecords([record(3, "c"), record(2, "b"), record(1, "a", true)]);
    expect(history.overview("初期テンプレート")).toMatchObject({ body: "a", activeVersion: 1, nextVersion: 4 });
  });
  it("版が1つも無ければ初期テンプレートから始め、保存はv1になる", () => {
    const history = PromptHistory.fromRecords([]);
    expect(history.active).toBeNull();
    expect(history.overview("初期テンプレート")).toEqual({
      versions: [], body: "初期テンプレート", activeVersion: null, nextVersion: 1,
    });
  });
});
