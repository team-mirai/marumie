import { PROMPT_BODY_MAX_LENGTH, normalizePromptBody, summarizePromptChange, validatePromptOwnerId, validatePromptVersion } from "@/server/contexts/research-fund/domain/models/prompt";
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
