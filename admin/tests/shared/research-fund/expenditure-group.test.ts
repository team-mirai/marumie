import { aggregateLinkedEntries } from "@/shared/research-fund/expenditure-group";

test("紐づけが無ければ 0 円・0 件・期間なし", () => {
  expect(aggregateLinkedEntries([])).toEqual({ amount: 0, count: 0, period: null });
});

test("金額を合計し、期間は日付の最小と最大にする（入力順に依らない）", () => {
  expect(
    aggregateLinkedEntries([
      { entryDate: "2026-05-14", amount: 3000 },
      { entryDate: "2026-02-08", amount: 1200 },
      { entryDate: "2026-03-01", amount: 500 },
    ]),
  ).toEqual({ amount: 4700, count: 3, period: { start: "2026-02-08", end: "2026-05-14" } });
});

test("1 件なら開始と終了が同じ日になる", () => {
  expect(aggregateLinkedEntries([{ entryDate: "2026-02-08", amount: 1200 }])).toEqual({
    amount: 1200,
    count: 1,
    period: { start: "2026-02-08", end: "2026-02-08" },
  });
});
