import {
  legalLabelOf,
  type ReviewAccount,
} from "@/server/contexts/research-fund/domain/models/journal-review";

// 科目マスタ（prisma/migrations/20260916170000_seed_research_fund_accounts）の対応から抜粋
const accounts: ReviewAccount[] = [
  { key: "needs-review", label: "要確認", type: "expense", legalLabel: null },
  { key: "taxi", label: "タクシー代", type: "expense", legalLabel: "⑨ 滞在費" },
  { key: "pc-electronics", label: "PC・電子機器", type: "expense", legalLabel: "③ 備品・消耗品費" },
  { key: "books-newspapers", label: "新聞・書籍代", type: "expense", legalLabel: "⑦ 調査研究費" },
  { key: "bank", label: "普通預金", type: "asset", legalLabel: null },
];

describe("legalLabelOf", () => {
  it.each([
    ["taxi", "⑨ 滞在費"],
    ["pc-electronics", "③ 備品・消耗品費"],
    ["books-newspapers", "⑦ 調査研究費"],
  ])("%s は科目マスタどおり %s になる", (accountKey, legalLabel) => {
    expect(legalLabelOf(accounts, accountKey)).toBe(legalLabel);
  });
  it("要確認の科目は法律上の区分が未定（null）", () => {
    expect(legalLabelOf(accounts, "needs-review")).toBeNull();
    expect(
      legalLabelOf([{ ...accounts[0], legalLabel: "⑩ その他の経費" }], "needs-review"),
    ).toBeNull();
  });
  it("未選択・マスタに無い科目・法定区分を持たない科目は未定（null）", () => {
    expect(legalLabelOf(accounts, "")).toBeNull();
    expect(legalLabelOf(accounts, "unknown")).toBeNull();
    expect(legalLabelOf(accounts, "bank")).toBeNull();
  });
});
