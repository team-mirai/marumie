const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// 並び替えタブに渡された props を取り出して、タブを押したときの動きを確かめる
const tabsProps: { current?: string; onChange?: (sort: string) => void } = {};
jest.mock("@/client/components/transactions/TransactionSortTabs", () => ({
  __esModule: true,
  default: (props: { current: string; onChange: (sort: string) => void }) => {
    tabsProps.current = props.current;
    tabsProps.onChange = props.onChange;
    return null;
  },
}));

import { renderToStaticMarkup } from "react-dom/server";
import TransactionsSection from "@/client/components/top-page/TransactionsSection";
import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";

function transaction(overrides: Partial<DisplayTransaction>): DisplayTransaction {
  return {
    id: "1",
    date: new Date("2025-05-01"),
    yearmonth: "2025.05",
    isReversal: false,
    transactionType: "expense",
    category: "政治活動費",
    account: "宣伝費",
    categoryKey: "advertising",
    label: "",
    shortLabel: "宣伝費",
    friendly_category: "宣伝費",
    absAmount: 1000,
    amount: -1000,
    ...overrides,
  };
}

const transactions = [
  transaction({ id: "1", date: new Date("2025-05-10"), friendly_category: "五月十日の支出" }),
  transaction({
    id: "2",
    date: new Date("2025-05-01"),
    friendly_category: "五月一日の支出",
    absAmount: 900000,
    amount: -900000,
  }),
];

function render() {
  return renderToStaticMarkup(
    <TransactionsSection
      transactionData={{ transactions, total: 100, page: 1, perPage: 2, totalPages: 50 }}
      updatedAt="2025-06-01"
      slug="team-mirai"
      year={2025}
      eyebrow="チームみらい・2025年"
    />,
  );
}

describe("TransactionsSection", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("並び替えタブは新しい順を選んだ状態で出す", () => {
    render();
    expect(tabsProps.current).toBe("new");
  });

  it.each([
    ["old", "/o/team-mirai/2025/transactions?sort=date&order=asc"],
    ["expDesc", "/o/team-mirai/2025/transactions?sort=expense&order=desc"],
    ["incDesc", "/o/team-mirai/2025/transactions?sort=income&order=desc"],
    ["new", "/o/team-mirai/2025/transactions"],
  ])("タブ %s を押すと、その並び順の全件ページへ移る", (sort, href) => {
    render();
    tabsProps.onChange?.(sort);
    expect(push).toHaveBeenCalledWith(href);
  });

  it("タブを押してもその場で行を並べ替えず、読み込んだ順（新しい順）のまま出す", () => {
    const html = render();
    expect(html.indexOf("五月十日の支出")).toBeLessThan(html.indexOf("五月一日の支出"));
  });

  it("「もっと見る」は新しい順の全件ページへ移る", () => {
    const html = render();
    expect(html).toContain('href="/o/team-mirai/2025/transactions"');
  });
});
