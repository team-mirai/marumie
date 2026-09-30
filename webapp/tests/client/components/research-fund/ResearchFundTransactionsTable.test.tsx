jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { renderToStaticMarkup } from "react-dom/server";
import ResearchFundTransactionsTable from "@/client/components/research-fund/ResearchFundTransactionsTable";
import {
  parseResearchFundTransactionsQuery,
  type ResearchFundTransactionsQuery,
} from "@/client/lib/research-fund-transactions";
import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

function view(overrides: Partial<ResearchFundExpenseView>): ResearchFundExpenseView {
  return {
    kind: "expense",
    id: "1",
    entryId: "1",
    date: "2026-04-23",
    month: "2026-04",
    description: "品川駅までタクシー",
    amount: 1200,
    accountKey: "transportation",
    detailed: { label: "交通費", color: "#0369A1", description: "航空券をのぞく電車・バス・タクシー代" },
    legal: { label: "⑨ 滞在費", color: "#0369A1" },
    note: null,
    splitGroup: null,
    groupId: null,
    hasReceipt: false,
    receiptKind: null,
    ...overrides,
  };
}

const expenses = [
  view({ id: "1", date: "2026-05-10", description: "品川駅までタクシー", amount: 1200 }),
  view({
    id: "2",
    date: "2026-05-01",
    description: "会議室の利用料",
    amount: 5000,
    accountKey: "meetings",
    detailed: { label: "会議費", color: "#111111" },
    legal: { label: "⑦ 調査研究費", color: "#111111" },
  }),
  view({ id: "3", date: "2026-04-20", description: "都営バス運賃", amount: 300 }),
];

function render(query: ResearchFundTransactionsQuery) {
  return renderToStaticMarkup(
    <ResearchFundTransactionsTable
      slug="taro"
      financialYear={2026}
      expenses={expenses}
      query={query}
    />,
  );
}

const order = (html: string, texts: string[]) => texts.map((text) => html.indexOf(text));

describe("ResearchFundTransactionsTable", () => {
  it("パラメーターなしなら新しい順・絞り込みなし・1ページ目で出す", () => {
    const html = render(parseResearchFundTransactionsQuery({}));

    const positions = order(html, ["品川駅までタクシー", "会議室の利用料", "都営バス運賃"]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("1〜3 / 3件を表示中");
    expect(html).not.toContain("（絞り込み中）");
  });

  it("URL で指定したカテゴリーで絞り込み、件数と合計・件数バッジも揃える", () => {
    const html = render(parseResearchFundTransactionsQuery({ categories: "meetings" }));

    expect(html).toContain("会議室の利用料");
    expect(html).not.toContain("品川駅までタクシー");
    expect(html).toContain("1〜1 / 1件を表示中　入金 0円・出金 5,000円（絞り込み中）");
    expect(html).toMatch(/aria-label="カテゴリーで絞り込む"[^>]*>[\s\S]*?<\/svg>1<\/button>/);
  });

  it("存在しないカテゴリーだけが指定されていれば、絞り込まずに全件を出す", () => {
    const html = render(parseResearchFundTransactionsQuery({ categories: "nope" }));

    expect(html).toContain("1〜3 / 3件を表示中");
    expect(html).not.toContain("（絞り込み中）");
  });

  it("URL で指定した並び順で出し、範囲外のページは最終ページに丸める", () => {
    const html = render(
      parseResearchFundTransactionsQuery({ sort: "amount", order: "asc", page: "99" }),
    );

    const positions = order(html, ["都営バス運賃", "品川駅までタクシー", "会議室の利用料"]);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("1〜3 / 3件を表示中");
  });

  it("各行のカテゴリーは、そのカテゴリー1つで絞り込んだ URL へのリンクにする", () => {
    const html = render(parseResearchFundTransactionsQuery({ sort: "amount" }));

    expect(html).toContain(
      'href="/p/taro/2026/transactions?categories=meetings&amp;sort=amount&amp;order=desc"',
    );
    expect(html).toMatch(
      /<a [^>]*href="\/p\/taro\/2026\/transactions\?categories=transportation&amp;sort=amount&amp;order=desc"[^>]*>交通費<\/a><button[^>]*aria-label="交通費の説明"/,
    );
  });
});
