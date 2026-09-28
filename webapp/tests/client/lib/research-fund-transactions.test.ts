import {
  filterResearchFundExpenses,
  formatResearchFundDate,
  paginateResearchFundExpenses,
  researchFundCategoryOptions,
  researchFundPagerItems,
  researchFundTransactionsSummary,
  sortResearchFundExpenses,
  toggleAmountSort,
  toggleDateSort,
} from "@/client/lib/research-fund-transactions";
import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

function view(overrides: Partial<ResearchFundExpenseView> = {}): ResearchFundExpenseView {
  return {
    id: "1",
    entryId: "1",
    date: "2026-04-23",
    month: "2026-04",
    description: "タクシー代",
    amount: 1200,
    detailed: { label: "交通費", color: "#0369A1" },
    legal: { label: "⑨ 滞在費", color: "#0369A1" },
    note: null,
    splitGroup: null,
    hasReceipt: false,
    receiptKind: null,
    ...overrides,
  };
}

const ids = (rows: ResearchFundExpenseView[]) => rows.map((row) => row.id);

describe("formatResearchFundDate", () => {
  it("月日の先頭の0を落として「.」でつなぐ", () => {
    expect(formatResearchFundDate("2026-05-08")).toBe("2026.5.8");
    expect(formatResearchFundDate("2026-10-20")).toBe("2026.10.20");
  });
});

describe("toggleDateSort / toggleAmountSort", () => {
  it("日付のボタンは新しい順⇄古い順を行き来し、金額順からは新しい順にする", () => {
    expect(toggleDateSort("new")).toBe("old");
    expect(toggleDateSort("old")).toBe("new");
    expect(toggleDateSort("amountDesc")).toBe("new");
  });

  it("金額のボタンは降順⇄昇順を行き来し、日付順からは降順にする", () => {
    expect(toggleAmountSort("amountDesc")).toBe("amountAsc");
    expect(toggleAmountSort("amountAsc")).toBe("amountDesc");
    expect(toggleAmountSort("new")).toBe("amountDesc");
  });
});

describe("sortResearchFundExpenses", () => {
  // 入力は buildExpenseViews の出力どおり、新しい順で同一注文の行（b1, b2）が隣り合う
  const rows = [
    view({ id: "a", date: "2026-05-10", amount: 500 }),
    view({ id: "b1", date: "2026-05-01", amount: 300, splitGroup: "order" }),
    view({ id: "b2", date: "2026-05-01", amount: 300, splitGroup: "order" }),
    view({ id: "c", date: "2026-04-20", amount: 1000 }),
  ];

  it("新しい順は入力の並びを保つ", () => {
    expect(ids(sortResearchFundExpenses(rows, "new"))).toEqual(["a", "b1", "b2", "c"]);
  });

  it("古い順でも同一注文の行は隣り合ったまま", () => {
    expect(ids(sortResearchFundExpenses(rows, "old"))).toEqual(["c", "b1", "b2", "a"]);
  });

  it("金額の降順・昇順に並べ、同額は元の並びを保つ", () => {
    expect(ids(sortResearchFundExpenses(rows, "amountDesc"))).toEqual(["c", "a", "b1", "b2"]);
    expect(ids(sortResearchFundExpenses(rows, "amountAsc"))).toEqual(["b1", "b2", "a", "c"]);
  });

  it("入力の配列を書き換えない", () => {
    sortResearchFundExpenses(rows, "old");
    expect(ids(rows)).toEqual(["a", "b1", "b2", "c"]);
  });
});

describe("filterResearchFundExpenses", () => {
  const rows = [
    view({ id: "1", detailed: { label: "交通費", color: "#000" } }),
    view({ id: "2", detailed: { label: "新聞・書籍代", color: "#000" } }),
    view({ id: "3", detailed: { label: "会議費", color: "#000" } }),
  ];

  it("何も選んでいなければ全件を返す", () => {
    expect(ids(filterResearchFundExpenses(rows, []))).toEqual(["1", "2", "3"]);
  });

  it("選んだ詳細の区分の行だけを返す（複数選択）", () => {
    expect(ids(filterResearchFundExpenses(rows, ["交通費", "会議費"]))).toEqual(["1", "3"]);
  });
});

describe("researchFundCategoryOptions", () => {
  it("出てくる詳細の区分を重複なく、法律上の区分の順（その他は最後）に並べる", () => {
    const options = researchFundCategoryOptions([
      view({ detailed: { label: "その他", color: "#000" }, legal: { label: "その他", color: "#000" } }),
      view({ detailed: { label: "交通費", color: "#000" }, legal: { label: "⑨ 滞在費", color: "#000" } }),
      view({ detailed: { label: "会議費", color: "#000" }, legal: { label: "⑦ 調査研究費", color: "#000" } }),
      view({ detailed: { label: "交通費", color: "#000" }, legal: { label: "⑨ 滞在費", color: "#000" } }),
      view({
        detailed: { label: "文房具・備品", color: "#000" },
        legal: { label: "③ 備品・消耗品費", color: "#000" },
      }),
    ]);

    expect(options.map((option) => option.label)).toEqual([
      "文房具・備品",
      "会議費",
      "交通費",
      "その他",
    ]);
  });
});

describe("paginateResearchFundExpenses", () => {
  const rows = Array.from({ length: 120 }, (_, i) => view({ id: String(i + 1) }));

  it("50件ずつに区切る", () => {
    const page = paginateResearchFundExpenses(rows, 1);
    expect(page.rows).toHaveLength(50);
    expect(page).toMatchObject({ page: 1, totalPages: 3, from: 1, to: 50 });
  });

  it("最終ページは残りの件数だけを返す", () => {
    const page = paginateResearchFundExpenses(rows, 3);
    expect(ids(page.rows)).toEqual(ids(rows.slice(100)));
    expect(page).toMatchObject({ page: 3, from: 101, to: 120 });
  });

  it("範囲外のページは先頭・末尾に丸める", () => {
    expect(paginateResearchFundExpenses(rows, 0).page).toBe(1);
    expect(paginateResearchFundExpenses(rows, 9).page).toBe(3);
  });

  it("0件なら1ページで 0〜0 とする", () => {
    expect(paginateResearchFundExpenses([], 1)).toEqual({
      rows: [],
      page: 1,
      totalPages: 1,
      from: 0,
      to: 0,
    });
  });
});

describe("researchFundPagerItems", () => {
  it("先頭・末尾・現在±1 以外を「…」で省略する", () => {
    expect(researchFundPagerItems(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
  });

  it("端のページでは片側だけ省略する", () => {
    expect(researchFundPagerItems(1, 6)).toEqual([1, 2, "…", 6]);
    expect(researchFundPagerItems(6, 6)).toEqual([1, "…", 5, 6]);
  });

  it("1つだけ飛ぶ場合も「…」にする", () => {
    expect(researchFundPagerItems(4, 6)).toEqual([1, "…", 3, 4, 5, 6]);
  });

  it("ページが少なければ全部並べる", () => {
    expect(researchFundPagerItems(1, 1)).toEqual([1]);
    expect(researchFundPagerItems(2, 3)).toEqual([1, 2, 3]);
  });
});

describe("researchFundTransactionsSummary", () => {
  it("表示範囲・件数・合計を出す", () => {
    expect(
      researchFundTransactionsSummary({
        from: 1,
        to: 50,
        total: 296,
        amount: 2212581,
        filtered: false,
      }),
    ).toBe("1〜50 / 296件を表示中　合計 2,212,581円");
  });

  it("絞り込み中はその旨を添える", () => {
    expect(
      researchFundTransactionsSummary({ from: 1, to: 3, total: 3, amount: 900, filtered: true }),
    ).toBe("1〜3 / 3件を表示中　合計 900円（絞り込み中）");
  });
});
