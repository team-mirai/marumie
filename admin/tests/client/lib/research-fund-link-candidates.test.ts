import {
  EMPTY_LINK_CANDIDATE_FILTER,
  filterLinkCandidates,
  isTakenByOtherGroup,
  type LinkCandidateFilter,
} from "@/client/lib/research-fund-link-candidates";
import type { LinkCandidate } from "@/server/contexts/research-fund/domain/models/expenditure-group";

function candidate(
  id: string,
  patch: Partial<LinkCandidate> = {},
): LinkCandidate {
  return {
    id,
    entryDate: "2026-05-14",
    description: `明細${id}`,
    amount: 1000,
    groupId: null,
    groupTitle: null,
    payeeName: null,
    accountLabel: "交通費",
    note: "",
    memo: "",
    documentId: null,
    ...patch,
  };
}

function ids(
  entries: readonly LinkCandidate[],
  patch: Partial<LinkCandidateFilter>,
  groupId: string | null = null,
  selected: readonly string[] = [],
) {
  return filterLinkCandidates(
    entries,
    { ...EMPTY_LINK_CANDIDATE_FILTER, ...patch },
    groupId,
    new Set(selected),
  ).map((entry) => entry.id);
}

test("条件が空ならすべての候補を出す", () => {
  const entries = [candidate("1"), candidate("2", { groupId: "9" })];
  expect(ids(entries, {})).toEqual(["1", "2"]);
});

test("キーワードは摘要・支払先・科目・特記事項・備考を大文字小文字を区別せずに探す", () => {
  const entries = [
    candidate("1", { description: "資料の印刷" }),
    candidate("2", { payeeName: "Tokyo Taxi" }),
    candidate("3", { accountLabel: "書籍費" }),
    candidate("4", { note: "視察のため" }),
    candidate("5", { memo: "立替分" }),
  ];
  expect(ids(entries, { query: "印刷" })).toEqual(["1"]);
  expect(ids(entries, { query: " taxi " })).toEqual(["2"]);
  expect(ids(entries, { query: "書籍" })).toEqual(["3"]);
  expect(ids(entries, { query: "視察" })).toEqual(["4"]);
  expect(ids(entries, { query: "立替" })).toEqual(["5"]);
  expect(ids(entries, { query: "   " })).toEqual(["1", "2", "3", "4", "5"]);
});

test("日付の範囲は両端を含む", () => {
  const entries = [
    candidate("1", { entryDate: "2026-03-01" }),
    candidate("2", { entryDate: "2026-04-15" }),
    candidate("3", { entryDate: "2026-05-31" }),
  ];
  expect(ids(entries, { dateFrom: "2026-04-15" })).toEqual(["2", "3"]);
  expect(ids(entries, { dateTo: "2026-04-15" })).toEqual(["1", "2"]);
  expect(ids(entries, { dateFrom: "2026-04-01", dateTo: "2026-04-30" })).toEqual(["2"]);
});

test("金額の範囲は両端を含み、カンマ区切りを受け付け、数字でない値は無視する", () => {
  const entries = [
    candidate("1", { amount: 500 }),
    candidate("2", { amount: 3000 }),
    candidate("3", { amount: 12000 }),
  ];
  expect(ids(entries, { amountMin: "3,000" })).toEqual(["2", "3"]);
  expect(ids(entries, { amountMax: "3000" })).toEqual(["1", "2"]);
  expect(ids(entries, { amountMin: "３，０００", amountMax: "１２０００" })).toEqual(["2", "3"]);
  expect(ids(entries, { amountMin: "abc", amountMax: "" })).toEqual(["1", "2", "3"]);
});

test("未紐づけのみは保存済みの紐づけが無い仕訳だけを出し、選んでも一覧から消さない", () => {
  const entries = [
    candidate("1"),
    candidate("2", { groupId: "5" }),
    candidate("3", { groupId: "9" }),
  ];
  expect(ids(entries, { state: "unlinked" }, "5", ["1"])).toEqual(["1"]);
});

test("この支出群のみは保存済みの紐づけと選択中の仕訳を出し、外しても一覧から消さない", () => {
  const entries = [
    candidate("1"),
    candidate("2", { groupId: "5" }),
    candidate("3", { groupId: "9" }),
  ];
  // 2 は外したが保存前なので残る。1 は選んだので出る
  expect(ids(entries, { state: "this-group" }, "5", ["1"])).toEqual(["1", "2"]);
  // 新規の支出群は選択中の仕訳だけ
  expect(ids(entries, { state: "this-group" }, null, ["1"])).toEqual(["1"]);
});

test("他の支出群に紐づいた仕訳だけを選べない仕訳として扱う", () => {
  expect(isTakenByOtherGroup(candidate("1"), "5")).toBe(false);
  expect(isTakenByOtherGroup(candidate("1", { groupId: "5" }), "5")).toBe(false);
  expect(isTakenByOtherGroup(candidate("1", { groupId: "9" }), "5")).toBe(true);
  expect(isTakenByOtherGroup(candidate("1", { groupId: "9" }), null)).toBe(true);
});
