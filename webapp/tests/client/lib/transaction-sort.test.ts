import {
  amountColumnSortState,
  dateColumnSortState,
  parseTransactionSort,
  sortTransactionRows,
  TRANSACTION_SORT_TABS,
  toggleAmountSort,
  toggleDateSort,
  transactionSortParams,
  type TransactionSort,
} from "@/client/lib/transaction-sort";

interface Row {
  id: string;
  date: string;
  /** 収入はプラス、支出はマイナス */
  amount: number;
}

const keys = { date: (row: Row) => row.date, signedAmount: (row: Row) => row.amount };
const ids = (rows: Row[]) => rows.map((row) => row.id);

describe("sortTransactionRows", () => {
  // 新しい順。収入（+）と支出（-）が混ざる
  const rows: Row[] = [
    { id: "exp-small", date: "2026-05-10", amount: -1_000 },
    { id: "inc-large", date: "2026-05-01", amount: 500_000 },
    { id: "exp-large", date: "2026-04-20", amount: -80_000 },
    { id: "inc-small", date: "2026-04-01", amount: 2_000 },
  ];

  it("新しい順・古い順に日付で並べる", () => {
    expect(ids(sortTransactionRows(rows, "new", keys))).toEqual([
      "exp-small",
      "inc-large",
      "exp-large",
      "inc-small",
    ]);
    expect(ids(sortTransactionRows(rows, "old", keys))).toEqual([
      "inc-small",
      "exp-large",
      "inc-large",
      "exp-small",
    ]);
  });

  it("支出が多い順は大きな支出が先頭で、収入は最後に小さい順で並ぶ", () => {
    expect(ids(sortTransactionRows(rows, "expDesc", keys))).toEqual([
      "exp-large",
      "exp-small",
      "inc-small",
      "inc-large",
    ]);
  });

  it("収入が多い順は大きな収入が先頭で、支出は最後に小さい順で並ぶ", () => {
    expect(ids(sortTransactionRows(rows, "incDesc", keys))).toEqual([
      "inc-large",
      "inc-small",
      "exp-small",
      "exp-large",
    ]);
  });

  it("金額の大きい順・小さい順は収入・支出を区別せず額の大きさで並べる", () => {
    expect(ids(sortTransactionRows(rows, "amountDesc", keys))).toEqual([
      "inc-large",
      "exp-large",
      "inc-small",
      "exp-small",
    ]);
    expect(ids(sortTransactionRows(rows, "amountAsc", keys))).toEqual([
      "exp-small",
      "inc-small",
      "exp-large",
      "inc-large",
    ]);
  });

  it("同じ順位の行は入力の並びを保ち、入力の配列は書き換えない", () => {
    const sameDay: Row[] = [
      { id: "a", date: "2026-05-01", amount: -300 },
      { id: "b", date: "2026-05-01", amount: -300 },
      { id: "c", date: "2026-04-01", amount: -300 },
    ];
    expect(ids(sortTransactionRows(sameDay, "old", keys))).toEqual(["c", "a", "b"]);
    expect(ids(sortTransactionRows(sameDay, "expDesc", keys))).toEqual(["a", "b", "c"]);
    expect(ids(sameDay)).toEqual(["a", "b", "c"]);
  });
});

describe("TRANSACTION_SORT_TABS", () => {
  it("SP のタブは新しい順・古い順・支出が多い順・収入が多い順の4つ", () => {
    expect(TRANSACTION_SORT_TABS.map((tab) => [tab.id, tab.label])).toEqual([
      ["new", "新しい順"],
      ["old", "古い順"],
      ["expDesc", "支出が多い順"],
      ["incDesc", "収入が多い順"],
    ]);
  });
});

describe("toggleDateSort / toggleAmountSort", () => {
  it("日付のボタンは新しい順⇄古い順を行き来し、ほかの並びからは新しい順にする", () => {
    expect(toggleDateSort("new")).toBe("old");
    expect(toggleDateSort("old")).toBe("new");
    expect(toggleDateSort("amountDesc")).toBe("new");
    expect(toggleDateSort("expDesc")).toBe("new");
  });

  it("金額のボタンは降順⇄昇順を行き来し、ほかの並びからは降順にする", () => {
    expect(toggleAmountSort("amountDesc")).toBe("amountAsc");
    expect(toggleAmountSort("amountAsc")).toBe("amountDesc");
    expect(toggleAmountSort("new")).toBe("amountDesc");
    expect(toggleAmountSort("incDesc")).toBe("amountDesc");
  });
});

describe("dateColumnSortState / amountColumnSortState", () => {
  it("日付順のときは日付列だけが選択中になり、aria-sort と読み上げ名で今の並びを伝える", () => {
    expect(dateColumnSortState("new")).toEqual({
      ariaSort: "descending",
      label: "日付で並び替え（今は新しい順）",
      active: true,
      flipped: false,
    });
    expect(dateColumnSortState("old")).toEqual({
      ariaSort: "ascending",
      label: "日付で並び替え（今は古い順）",
      active: true,
      flipped: true,
    });
    expect(amountColumnSortState("new")).toEqual({
      ariaSort: "none",
      label: "金額で並び替え（今は金額順ではありません）",
      active: false,
      flipped: false,
    });
  });

  it("金額順のときは金額列だけが選択中になる", () => {
    expect(amountColumnSortState("amountDesc")).toMatchObject({
      ariaSort: "descending",
      label: "金額で並び替え（今は大きい順）",
      active: true,
    });
    expect(amountColumnSortState("amountAsc")).toMatchObject({
      ariaSort: "ascending",
      label: "金額で並び替え（今は小さい順）",
      flipped: true,
    });
    expect(dateColumnSortState("amountAsc")).toMatchObject({
      ariaSort: "none",
      label: "日付で並び替え（今は日付順ではありません）",
      active: false,
    });
  });

  it("支出・収入が多い順のときは、金額列の aria-sort と読み上げ名で符号付きの金額順を伝え、見た目は選択中にしない", () => {
    expect(amountColumnSortState("expDesc")).toEqual({
      ariaSort: "ascending",
      label: "金額で並び替え（今は支出が多い順）",
      active: false,
      flipped: false,
    });
    expect(amountColumnSortState("incDesc")).toEqual({
      ariaSort: "descending",
      label: "金額で並び替え（今は収入が多い順）",
      active: false,
      flipped: false,
    });
    for (const sort of ["expDesc", "incDesc"] as const) {
      expect(dateColumnSortState(sort).ariaSort).toBe("none");
    }
  });
});

describe("parseTransactionSort / transactionSortParams", () => {
  it("sort / order を並び順にする（無ければ新しい順、order が無ければ降順）", () => {
    expect(parseTransactionSort(undefined, undefined)).toBe("new");
    expect(parseTransactionSort("date", "asc")).toBe("old");
    expect(parseTransactionSort("amount", undefined)).toBe("amountDesc");
    expect(parseTransactionSort("expense", "desc")).toBe("expDesc");
    expect(parseTransactionSort("income", undefined)).toBe("incDesc");
  });

  it("不正な組み合わせは新しい順に倒す", () => {
    expect(parseTransactionSort("name", "desc")).toBe("new");
    expect(parseTransactionSort("expense", "asc")).toBe("new");
  });

  it("URL に載せた並び順を読み戻すと同じになる", () => {
    const sorts: TransactionSort[] = ["new", "old", "expDesc", "incDesc", "amountDesc", "amountAsc"];
    for (const sort of sorts) {
      const params = transactionSortParams(sort);
      expect(parseTransactionSort(params.sort, params.order)).toBe(sort);
    }
  });
});
