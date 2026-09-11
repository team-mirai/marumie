import { describePublishDelta } from "@/client/lib/research-fund-publish";
import { aggregateResearchFund, type ResearchFundRow } from "@/shared/research-fund/aggregation";

const accounts = {
  taxi: { label: "タクシー代", legalLabel: "④ 交通費" },
  postage: { label: "郵送料", legalLabel: "⑤ 通信費" },
  "grant-income": { label: "調査研究費収入", legalLabel: "" },
};
function aggregate(rows: ResearchFundRow[]) {
  const result = aggregateResearchFund(rows, accounts);
  if (result.status === "invalid") throw new Error(result.errors[0].message);
  return result.value;
}
const grant: ResearchFundRow = {
  date: "2026-02-01",
  accountKey: "grant-income",
  amount: 1_000_000,
  type: "grant",
};
const taxi: ResearchFundRow = {
  date: "2026-08-13",
  accountKey: "taxi",
  amount: 1500,
  type: "expense",
};

test("費目の増分と未使用の減少を一文にする", () => {
  expect(describePublishDelta(aggregate([grant]), aggregate([grant, taxi]))).toBe(
    "公開すると：タクシー代 +¥1,500・未使用 −¥1,500",
  );
});

test("費目は増分の大きい順に並べ、未使用は常に末尾に置く", () => {
  const after = aggregate([
    grant,
    taxi,
    { date: "2026-08-20", accountKey: "postage", amount: 20_000, type: "expense" },
  ]);
  expect(describePublishDelta(aggregate([grant]), after)).toBe(
    "公開すると：郵送料 +¥20,000・タクシー代 +¥1,500・未使用 −¥21,500",
  );
});

test("支給を公開すると未使用が増える", () => {
  expect(describePublishDelta(aggregate([]), aggregate([grant]))).toBe(
    "公開すると：未使用 +¥1,000,000",
  );
});

test("変化が無ければ何も返さない", () => {
  expect(describePublishDelta(aggregate([grant]), aggregate([grant]))).toBeNull();
});
