import {
  filterJournalEntries,
  journalAccountLabel,
} from "@/client/lib/research-fund-journal-filter";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";

function entry(id: string, overrides: Partial<ReviewEntry> = {}): ReviewEntry {
  return {
    id,
    entryDate: "2026-08-01",
    description: "視察の移動",
    amount: 1200,
    accountKey: "transportation",
    note: "",
    memo: "",
    source: "scan",
    documentId: "doc",
    splitGroup: null,
    status: "draft",
    updatedAt: "2026-08-01T12:00:00.000Z",
    model: null,
    promptVersion: null,
    advancedBy: null,
    settledAt: null,
    payeeId: null,
    payeeLinkSource: null,
    receiptAbsent: false,
    receiptAbsenceReason: null,
    receiptNumber: null,
    issuer: null,
    ...overrides,
  };
}
const noFilter = {
  month: "",
  advancer: "",
  unsettledOnly: false,
  payeeUnsetOnly: false,
  receiptMissingOnly: false,
  query: "",
};
const payeeNames = new Map([
  ["p1", "日本交通株式会社"],
  ["p2", "Amazon"],
]);
const taxi = entry("taxi", { payeeId: "p1" });
const book = entry("book", {
  entryDate: "2026-09-10",
  description: "政策資料の購入",
  accountKey: "books-newspapers",
  payeeId: "p2",
  advancedBy: "秘書A",
});
const unconfirmed = entry("unconfirmed", { description: "不明な支出", accountKey: "needs-review" });
const grant = entry("grant", {
  description: "調査研究広報滞在費 8月分",
  accountKey: "grant-income",
  source: "grant",
  documentId: null,
  status: "approved",
});
const entries = [taxi, book, unconfirmed, grant];
const ids = (query: string, filter: Partial<typeof noFilter> = {}) =>
  filterJournalEntries(entries, { ...noFilter, ...filter, query }, payeeNames).map((e) => e.id);

test("一覧の科目ラベルは、支給なら「支給」、未確定なら「要確認」、それ以外は科目名", () => {
  expect(journalAccountLabel(taxi)).toBe("交通費");
  expect(journalAccountLabel(grant)).toBe("支給");
  expect(journalAccountLabel(unconfirmed)).toBe("要確認");
  expect(journalAccountLabel(entry("x", { accountKey: "unknown" }))).toBe("要確認");
});

test("検索語が空（空白だけを含む）なら絞り込まない", () => {
  expect(ids("")).toEqual(["taxi", "book", "unconfirmed", "grant"]);
  expect(ids("  ")).toEqual(["taxi", "book", "unconfirmed", "grant"]);
});

test("一覧に表示している科目名で照合する（内部のキーでは当たらない）", () => {
  expect(ids("交通")).toEqual(["taxi"]);
  expect(ids("transportation")).toEqual([]);
  expect(ids("要確認")).toEqual(["unconfirmed"]);
  expect(ids("支給")).toEqual(["grant"]);
});

test("項目（摘要）で照合する", () => {
  expect(ids("資料")).toEqual(["book"]);
  expect(ids("8月分")).toEqual(["grant"]);
});

test("支払先名で照合する。英字は大文字・小文字を区別しない", () => {
  expect(ids("日本交通")).toEqual(["taxi"]);
  expect(ids("amazon")).toEqual(["book"]);
});

test("支給の行は支払先を表示していないので、支払先では照合しない", () => {
  const grantWithPayee = { ...grant, payeeId: "p1" };
  expect(
    filterJournalEntries([grantWithPayee], { ...noFilter, query: "日本交通" }, payeeNames),
  ).toEqual([]);
});

test("一致する仕訳がなければ空になる", () => {
  expect(ids("存在しない語")).toEqual([]);
});

test("検索は既存の絞り込みと組み合わせて効く", () => {
  expect(ids("", { month: "09" })).toEqual(["book"]);
  expect(ids("交通", { month: "09" })).toEqual([]);
  expect(ids("資料", { advancer: "秘書A" })).toEqual(["book"]);
  expect(ids("交通", { unsettledOnly: true })).toEqual([]);
  expect(ids("不明", { payeeUnsetOnly: true })).toEqual(["unconfirmed"]);
  expect(ids("交通", { receiptMissingOnly: true })).toEqual([]);
});

test("書類なしの絞り込みは、書類が無く徴難も付いていない支出だけを残す", () => {
  const missing = entry("missing", { source: "manual", documentId: null });
  const absent = entry("absent", { source: "manual", documentId: null, receiptAbsent: true });
  const absentWithDocument = entry("absent-with-document", { receiptAbsent: true });
  expect(
    filterJournalEntries(
      [taxi, grant, missing, absent, absentWithDocument],
      { ...noFilter, receiptMissingOnly: true },
      payeeNames,
    ).map((e) => e.id),
  ).toEqual(["missing"]);
});
