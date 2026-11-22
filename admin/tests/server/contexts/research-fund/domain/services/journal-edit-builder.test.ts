import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import { buildJournalEditWrite } from "@/server/contexts/research-fund/domain/services/journal-edit-builder";

const accounts: ResearchFundAccount[] = [
  { key: "taxi", type: "expense" },
  { key: "bank", type: "asset" },
  { key: "grant-income", type: "income" },
];
const input = { entryDate: "2026-08-01", description: "視察の移動", amount: 1200, accountKey: "taxi", note: "公開メモ", memo: "内部メモ" };
const expense: ReviewEntry = { ...input, id: "2", source: "scan", documentId: "3", splitGroup: null, status: "draft", updatedAt: "2026-08-01T12:00:00.000Z", model: null, promptVersion: null, advancedBy: null, settledAt: null, payeeId: null, payeeLinkSource: null, receiptAbsent: false, receiptAbsenceReason: null, receiptNumber: null, issuer: null, legalCategoryOverride: null };
const grantInput = { entryDate: "2026-08-01", description: "調査研究広報滞在費 8月分", amount: 1_000_000, accountKey: "grant-income", note: "", memo: "" };
const grant: ReviewEntry = { ...expense, ...grantInput, source: "grant", documentId: null, status: "approved" };

function build(override: Partial<Parameters<typeof buildJournalEditWrite>[0]> = {}) {
  return buildJournalEditWrite({ entry: expense, raw: input, approve: false, year: 2026, termStart: "2026-07-15", accounts, ...override });
}
function messageOf(result: ReturnType<typeof buildJournalEditWrite>) {
  return result.status === "invalid" ? result.errors[0].message : null;
}

describe("buildJournalEditWrite: 支出の仕訳", () => {
  it.each(["draft", "approved"] as const)("確認つきでなければ %s のまま保存する", status => {
    const result = build({ entry: { ...expense, status } });
    expect(result.status === "valid" && result.value.status).toBe(status);
  });
  it("確認つきで保存すれば確認済になる", () => {
    const result = build({ approve: true });
    expect(result).toMatchObject({ status: "valid", value: { status: "approved", amount: 1200, lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] } });
  });
  it("書類のある仕訳は書類を含めた hash を作る", () => {
    const withDocument = build();
    const withoutDocument = build({ entry: { ...expense, source: "manual", documentId: null } });
    expect(withDocument.status === "valid" && withoutDocument.status === "valid" && withDocument.value.hash !== withoutDocument.value.hash).toBe(true);
  });
  it("帳簿の年度外の日付は保存しない", () => {
    expect(messageOf(build({ raw: { ...input, entryDate: "2025-08-01" } }))).toBe("帳簿の年度内の日付を指定してください");
  });
});

describe("buildJournalEditWrite: 支給の仕訳", () => {
  const buildGrant = (override: Partial<Parameters<typeof buildJournalEditWrite>[0]> = {}) => build({ entry: grant, raw: grantInput, ...override });
  it("支給日だけを直し、状態は変えずに hash を作り直す", () => {
    const before = buildGrant();
    const after = buildGrant({ raw: { ...grantInput, entryDate: "2026-08-20" } });
    expect(after).toMatchObject({ status: "valid", value: { entryDate: "2026-08-20", amount: 1_000_000, description: "調査研究広報滞在費 8月分", status: "approved", lines: [{ side: "debit", accountKey: "bank", amount: 1_000_000 }, { side: "credit", accountKey: "grant-income", amount: 1_000_000 }] } });
    expect(before.status === "valid" && after.status === "valid" && before.value.hash !== after.value.hash).toBe(true);
  });
  it("対象月は登録時の仕訳日の年月で決まり、月をまたぐ支給日にはできない", () => {
    expect(messageOf(buildGrant({ raw: { ...grantInput, entryDate: "2026-09-01" } }))).toContain("その月の日付");
  });
  it("支給日以外は直せない", () => {
    expect(messageOf(buildGrant({ raw: { ...grantInput, amount: 2_000_000 } }))).toBe("支給は支給日だけを変更できます");
  });
  it("支給日の形が不正なら、支給日を入力し直させる", () => {
    expect(messageOf(buildGrant({ raw: { ...grantInput, entryDate: "2026-08-32" } }))).toBe("支給日を正しく入力してください");
  });
  it("帳簿の当選日が無ければ保存しない", () => {
    expect(messageOf(buildGrant({ termStart: null }))).toBe("帳簿が見つかりません");
  });
});
