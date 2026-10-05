import { parse } from "node-html-parser";
import { renderToStaticMarkup } from "react-dom/server";
import TransactionTable from "@/client/components/top-page/features/transactions-table/TransactionTable";
import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";

function transaction(overrides: Partial<DisplayTransaction>): DisplayTransaction {
  return {
    id: "1",
    date: new Date("2026-05-10"),
    yearmonth: "2026.05",
    transactionType: "expense",
    category: "経常経費",
    subcategory: "事務所費",
    account: "事務所費",
    categoryKey: "office-expenses",
    label: "",
    shortLabel: "事務所費",
    friendly_category: "事務所の家賃",
    absAmount: 80000,
    amount: -80000,
    ...overrides,
  };
}

const categoryHref = (categoryKey: string) =>
  `/o/sample-party/2026/transactions?categories=${categoryKey}`;

/** 行のカテゴリーのラベル。SP 用（md:hidden）と PC 用（hidden md:table-cell）の 2 つを返す */
function categoryCells(html: string) {
  const cells = parse(html).querySelectorAll("tbody td");
  const sp = cells.find((cell) => cell.classNames.includes("md:hidden"));
  const pc = cells.filter((cell) => cell.classNames.includes("md:table-cell"))[1];
  return { sp, pc };
}

describe("TransactionTable", () => {
  it("categoryHref を渡すと、PC・SP どちらのカテゴリーのラベルもそのカテゴリーで絞り込むリンクになる", () => {
    const html = renderToStaticMarkup(
      <TransactionTable transactions={[transaction({})]} categoryHref={categoryHref} />,
    );

    const { sp, pc } = categoryCells(html);
    for (const cell of [sp, pc]) {
      const link = cell?.querySelector("a");
      expect(link?.getAttribute("href")).toBe(
        "/o/sample-party/2026/transactions?categories=office-expenses",
      );
      expect(link?.text).toBe("事務所費");
    }
  });

  it("リンクにしてもラベルの色・枠は変わらず、ホバーでリンクだと分かる", () => {
    const plain = renderToStaticMarkup(<TransactionTable transactions={[transaction({})]} />);
    const linked = renderToStaticMarkup(
      <TransactionTable transactions={[transaction({})]} categoryHref={categoryHref} />,
    );

    const pill = (html: string) => {
      const pc = categoryCells(html).pc;
      return pc?.querySelector("a") ?? pc?.querySelector("div > div");
    };

    const before = pill(plain);
    const after = pill(linked);
    expect(before?.tagName).toBe("DIV");
    expect(after?.tagName).toBe("A");
    expect(after?.getAttribute("style")).toBe(before?.getAttribute("style"));
    expect(after?.getAttribute("class")).toBe(
      `${before?.getAttribute("class")} cursor-pointer hover:underline`,
    );
    expect(after?.querySelector("span")?.getAttribute("style")).toBe(
      before?.querySelector("span")?.getAttribute("style"),
    );
  });

  it("収入のカテゴリーも、そのカテゴリーのキーで絞り込むリンクになる", () => {
    const html = renderToStaticMarkup(
      <TransactionTable
        transactions={[
          transaction({
            transactionType: "income",
            account: "個人からの寄附",
            categoryKey: "individual-donations",
            shortLabel: "個人寄附",
            amount: 10000,
          }),
        ]}
        categoryHref={categoryHref}
      />,
    );

    expect(categoryCells(html).pc?.querySelector("a")?.getAttribute("href")).toBe(
      "/o/sample-party/2026/transactions?categories=individual-donations",
    );
  });

  it("絞り込みのキーが無い科目はリンクにしない", () => {
    const html = renderToStaticMarkup(
      <TransactionTable
        transactions={[
          transaction({ account: "未知の科目", categoryKey: "undefined", shortLabel: "不明" }),
        ]}
        categoryHref={categoryHref}
      />,
    );

    expect(parse(html).querySelectorAll("tbody a")).toHaveLength(0);
    expect(html).toContain("不明");
  });

  it("保存済みの category_key が勘定科目のキーと食い違う行はリンクにしない", () => {
    // 絞り込みはサーバーが保存済みの category_key で照合するため、科目から決めたキーで
    // リンクにするとその行自身が絞り込み結果から漏れてしまう
    const html = renderToStaticMarkup(
      <TransactionTable
        transactions={[transaction({ categoryKey: "organizational-activities" })]}
        categoryHref={categoryHref}
      />,
    );

    expect(parse(html).querySelectorAll("tbody a")).toHaveLength(0);
    expect(html).toContain("事務所費");
  });

  it("categoryHref を渡さない表（トップページ）ではラベルをリンクにしない", () => {
    const html = renderToStaticMarkup(<TransactionTable transactions={[transaction({})]} />);

    expect(parse(html).querySelectorAll("tbody a")).toHaveLength(0);
    expect(html).toContain("事務所費");
  });
});
