import { aggregateResearchFund, type ResearchFundRow } from "@/shared/research-fund/aggregation";
import {
  buildLegalCategoryCatalog,
  legalCategoryOverrideOf,
  resolveLegalCategoryKey,
  resolveLegalLabel,
} from "@/shared/research-fund/legal-category";

const research = { key: "research", label: "⑦ 調査研究費" };

describe("法定区分の決め方（#1880）", () => {
  const catalog = buildLegalCategoryCatalog([
    { legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
    { legalCategoryKey: "office", legalLabel: "④ 事務所費" },
    { legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
    // 同じ区分を持つ科目は複数ある
    { legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
    // 法定区分を持たない科目（要確認）は一覧に入れない
    { legalCategoryKey: null, legalLabel: null },
  ]);

  it("科目マスタから法定区分を重複なく①〜⑩の順に並べる", () => {
    expect([...catalog.values()]).toEqual([
      { key: "office", label: "④ 事務所費" },
      research,
      { key: "stay", label: "⑨ 滞在費" },
    ]);
  });

  it("上書きがあればそれ、無ければ科目の既定の区分になる", () => {
    expect(resolveLegalLabel("④ 事務所費", research)).toBe("⑦ 調査研究費");
    expect(resolveLegalCategoryKey("office", research)).toBe("research");
    expect(resolveLegalLabel("④ 事務所費", null)).toBe("④ 事務所費");
    expect(resolveLegalCategoryKey("office", undefined)).toBe("office");
    expect(resolveLegalLabel(null, null)).toBeNull();
  });

  it("上書きのキーを区分に引き当て、上書きが無ければ null", () => {
    expect(legalCategoryOverrideOf("research", catalog)).toEqual(research);
    expect(legalCategoryOverrideOf(null, catalog)).toBeNull();
    expect(legalCategoryOverrideOf(undefined, catalog)).toBeNull();
  });

  it("科目マスタに無い区分の上書きは、黙って既定に戻さず例外にする", () => {
    expect(() => legalCategoryOverrideOf("unknown", catalog)).toThrow("unknown");
  });
});

describe("集計と法定区分の上書き", () => {
  const accounts = {
    "ai-tools": { label: "AIツール", legalLabel: "④ 事務所費" },
    lodging: { label: "宿泊費", legalLabel: "⑨ 滞在費" },
  };
  const rows: ResearchFundRow[] = [
    { date: "2026-03-01", accountKey: "grant-income", amount: 100_000, type: "grant" },
    { date: "2026-03-02", accountKey: "ai-tools", amount: 3_000, type: "expense" },
    {
      date: "2026-03-03",
      accountKey: "ai-tools",
      amount: 5_000,
      type: "expense",
      legalCategoryOverride: research,
    },
    {
      date: "2026-03-04",
      accountKey: "lodging",
      amount: 10_000,
      type: "expense",
      legalCategoryOverride: research,
    },
  ];

  it("法律上の区分では、上書きした仕訳を上書き先の区分に数える", () => {
    const result = aggregateResearchFund(rows, accounts, "legal");
    expect(result.status === "valid" && result.value.categories).toEqual([
      { key: "④ 事務所費", label: "④ 事務所費", kind: "expense", totalAmount: 3_000, count: 1 },
      {
        key: "⑦ 調査研究費",
        label: "⑦ 調査研究費",
        kind: "expense",
        totalAmount: 15_000,
        count: 2,
      },
      { key: "unused", label: "未使用", kind: "unused", totalAmount: 82_000, count: 0 },
    ]);
  });

  it("詳細の区分（科目）の集計は上書きの影響を受けない", () => {
    const withOverride = aggregateResearchFund(rows, accounts, "detailed");
    const withoutOverride = aggregateResearchFund(
      rows.map(({ legalCategoryOverride: _, ...row }) => row),
      accounts,
      "detailed",
    );
    expect(withOverride).toEqual(withoutOverride);
  });
});
