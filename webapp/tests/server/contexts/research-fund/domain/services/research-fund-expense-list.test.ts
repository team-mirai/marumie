import type {
  PublishedAccount,
  PublishedExpense,
} from "@/server/contexts/research-fund/domain/models/published-research-fund";
import {
  buildExpenseViews,
  splitGroupNote,
} from "@/server/contexts/research-fund/domain/services/research-fund-expense-list";

const accounts: Record<string, PublishedAccount> = {
  taxi: { label: "タクシー代", legalLabel: "⑨ 滞在費", legalCategoryKey: "stay" },
  "stationery-supplies": {
    label: "文房具・備品",
    legalLabel: "③ 備品・消耗品費",
    legalCategoryKey: "equipment-supplies",
  },
};

function expense(overrides: Partial<PublishedExpense> = {}): PublishedExpense {
  return {
    id: "1",
    entryId: "1",
    date: "2026-04-23",
    accountKey: "taxi",
    description: "タクシー代",
    amount: 1200,
    note: null,
    splitGroup: null,
    hasReceipt: false,
    ...overrides,
  };
}

describe("buildExpenseViews", () => {
  it("日付の新しい順に並べる", () => {
    const views = buildExpenseViews(
      [
        expense({ id: "1", entryId: "1", date: "2026-04-01" }),
        expense({ id: "2", entryId: "2", date: "2026-05-01" }),
      ],
      accounts,
    );

    expect(views.map((view) => view.date)).toEqual(["2026-05-01", "2026-04-01"]);
    expect(views.map((view) => view.month)).toEqual(["2026-05", "2026-04"]);
  });

  it("同一注文の分割行を隣り合わせにし、何点で1注文かを特記事項に添える", () => {
    const views = buildExpenseViews(
      [
        expense({ id: "10", entryId: "10", splitGroup: "order-1", description: "トナー代" }),
        expense({ id: "11", entryId: "11", description: "電車代" }),
        expense({ id: "12", entryId: "12", splitGroup: "order-1", description: "トナー代" }),
      ],
      accounts,
    );

    expect(views.map((view) => view.id)).toEqual(["11", "10", "12"]);
    expect(views[1].note).toBe(splitGroupNote(2));
    expect(views[2].note).toBe(splitGroupNote(2));
  });

  it("特記事項がある分割行は、元の特記事項と分割の説明を並べる", () => {
    const views = buildExpenseViews(
      [
        expense({ id: "1", entryId: "1", splitGroup: "order-1", note: "会派で按分" }),
        expense({ id: "2", entryId: "2", splitGroup: "order-1", note: "会派で按分" }),
      ],
      accounts,
    );

    expect(views[0].note).toBe(`会派で按分／${splitGroupNote(2)}`);
  });

  it("分割していない行の特記事項はそのまま、無ければ null", () => {
    const views = buildExpenseViews(
      [
        expense({ id: "1", entryId: "1", note: "領収書の発行なし" }),
        expense({ id: "2", entryId: "2", date: "2026-04-22", note: "   " }),
      ],
      accounts,
    );

    expect(views[0].note).toBe("領収書の発行なし");
    expect(views[1].note).toBeNull();
  });

  it("詳細の区分と法律上の区分の両方のラベルを持たせる", () => {
    const [view] = buildExpenseViews(
      [expense({ accountKey: "stationery-supplies" })],
      accounts,
    );

    expect(view.detailed.label).toBe("文房具・備品");
    expect(view.legal.label).toBe("③ 備品・消耗品費");
    expect(view.detailed.color).toBe(view.legal.color);
  });

  it("科目マスタに無い科目でも行を落とさない", () => {
    const [view] = buildExpenseViews([expense({ accountKey: "unknown" })], accounts);

    expect(view.detailed.label).toBe("その他");
    expect(view.legal.label).toBe("その他");
  });

  it("分割グループをそのまま渡す（CSV が注文単位に束ね直せるように）", () => {
    const views = buildExpenseViews(
      [
        expense({ id: "1", entryId: "1", splitGroup: "order-1" }),
        expense({ id: "2", entryId: "2", splitGroup: null }),
      ],
      accounts,
    );

    expect(views.find((view) => view.id === "1")?.splitGroup).toBe("order-1");
    expect(views.find((view) => view.id === "2")?.splitGroup).toBeNull();
  });
});
