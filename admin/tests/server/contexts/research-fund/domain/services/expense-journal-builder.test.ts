import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import type { JournalEdit } from "@/server/contexts/research-fund/domain/models/journal-review";
import { buildExpenseJournalWrite } from "@/server/contexts/research-fund/domain/services/expense-journal-builder";

const accounts: ResearchFundAccount[] = [
  { key: "taxi", type: "expense" },
  { key: "needs-review", type: "expense" },
  { key: "bank", type: "asset" },
  { key: "cash", type: "asset" },
  { key: "grant-income", type: "income" },
];
const raw: JournalEdit = {
  entryDate: "2026-08-01",
  description: "視察の移動",
  amount: 1200,
  accountKey: "taxi",
  note: "公開メモ",
  memo: "内部メモ",
};
function build(override: Partial<Parameters<typeof buildExpenseJournalWrite>[0]> = {}) {
  return buildExpenseJournalWrite({
    raw,
    source: "manual",
    documentId: null,
    status: "draft",
    year: 2026,
    accounts,
    ...override,
  });
}

describe("buildExpenseJournalWrite", () => {
  it("費用科目を借方、普通預金を貸方にした2行と hash を組み立てる", () => {
    const result = build();
    expect(result).toEqual({
      status: "valid",
      value: {
        ...raw,
        status: "draft",
        hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        lines: [
          { side: "debit", accountKey: "taxi", amount: 1200 },
          { side: "credit", accountKey: "bank", amount: 1200 },
        ],
      },
    });
  });

  it("渡した状態をそのまま保存する形に載せる", () => {
    const result = build({ status: "approved" });
    expect(result).toMatchObject({ status: "valid", value: { status: "approved" } });
  });

  it("書類から読み取った仕訳は、hash に書類IDを含める", () => {
    const withDocument = build({ source: "scan", documentId: "3" });
    const withoutDocument = build({ source: "scan", documentId: null });
    expect(withDocument.status).toBe("valid");
    expect(withoutDocument.status).toBe("valid");
    if (withDocument.status !== "valid" || withoutDocument.status !== "valid") return;
    expect(withDocument.value.hash).not.toBe(withoutDocument.value.hash);
  });

  // hash は重複検知で保存済みの仕訳と突き合わせるので、組み立てを動かしても値が変わってはいけない。
  it.each([
    [null, "5495c90e11307c8847c3ef02bb32d4d1637a7d03b9ba56fa556b0c0774657263"],
    ["3", "88fa8d179950be742ba83d248d08f6bd86dd89db2ec0bf06dc527c7c900a7f06"],
  ])("既存の仕訳の hash は変わらない（書類ID %p）", (documentId, hash) => {
    expect(build({ documentId })).toMatchObject({ status: "valid", value: { hash } });
  });

  it.each(["2025-12-31", "2027-01-01"])("帳簿の年度外の仕訳日 %s は受け付けない", (entryDate) => {
    expect(build({ raw: { ...raw, entryDate } })).toMatchObject({
      status: "invalid",
      errors: [{ path: "entryDate", message: "帳簿の年度内の日付を指定してください" }],
    });
  });

  it("帳簿が見つからなければ仕訳日を確かめられないので受け付けない", () => {
    expect(build({ year: null })).toMatchObject({
      status: "invalid",
      errors: [{ message: "帳簿の年度内の日付を指定してください" }],
    });
  });

  it.each([
    { amount: 0 },
    { amount: 1.5 },
    { entryDate: "2026-02-30" },
    { description: " " },
    { description: "a".repeat(256) },
  ])("不正な入力 %j は受け付けない", (override) => {
    expect(build({ raw: { ...raw, ...override } })).toMatchObject({
      status: "invalid",
      errors: [{ message: "日付・金額・項目名・科目を正しく入力してください" }],
    });
  });

  it("科目マスタに無い科目は受け付けない", () => {
    expect(build({ raw: { ...raw, accountKey: "missing" } })).toMatchObject({
      status: "invalid",
      errors: [{ message: "科目が見つかりません" }],
    });
  });

  it("決済科目（普通預金）が科目マスタに無ければ受け付けない", () => {
    expect(build({ accounts: accounts.filter((a) => a.key !== "bank") })).toMatchObject({
      status: "invalid",
      errors: [{ message: "科目が見つかりません" }],
    });
  });

  it.each(["bank", "grant-income"])("支出に費用科目でない %s は指定できない", (accountKey) => {
    expect(build({ raw: { ...raw, accountKey } })).toMatchObject({ status: "invalid" });
  });
});
