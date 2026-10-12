import {
  DEFAULT_ADDRESS_SEARCH_PROMPT,
  buildAutomaticAddressSearchPrompt,
  buildPayeeAddressSearchPrompt,
} from "@/server/contexts/research-fund/domain/services/payee-address-search-prompt";
test("デフォルトの議員室プロンプトは取引先の住所検索と同じ指示で、検索対象と出力形式は含まない", () => {
  expect(DEFAULT_ADDRESS_SEARCH_PROMPT).toContain("本社または主たる事務所の住所を特定してください");
  expect(DEFAULT_ADDRESS_SEARCH_PROMPT).toContain("【confidence の基準】");
  expect(DEFAULT_ADDRESS_SEARCH_PROMPT).not.toContain("会社名:");
  expect(DEFAULT_ADDRESS_SEARCH_PROMPT).not.toContain("【出力形式】");
});
test("画面に出す自動付加部分は、差し込み位置の見本と出力形式を示す", () => {
  const automatic = buildAutomaticAddressSearchPrompt();
  expect(automatic).toContain("会社名: （検索する名称）");
  expect(automatic).toContain("検索ヒント: （検索ヒント。入力したときだけ付加）");
  expect(automatic).toContain("【出力形式】");
  expect(automatic).toContain('"candidates"');
});
test("議員室プロンプトの後ろに名称・検索ヒント・出力形式を付加する", () => {
  const prompt = buildPayeeAddressSearchPrompt("独自の指示", "株式会社テスト", "印刷業");
  expect(prompt.startsWith("独自の指示\n\n会社名: 株式会社テスト\n検索ヒント: 印刷業\n")).toBe(true);
  expect(prompt).toContain("【出力形式】");
});
test("検索ヒントが無ければヒントの行を付けない", () => {
  const prompt = buildPayeeAddressSearchPrompt("独自の指示", "株式会社テスト");
  expect(prompt).toContain("会社名: 株式会社テスト\n\n【出力形式】");
  expect(prompt).not.toContain("検索ヒント");
});
