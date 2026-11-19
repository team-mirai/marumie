import { buildMonthlyViews } from "@/server/contexts/research-fund/domain/services/research-fund-monthly";

describe("buildMonthlyViews", () => {
  const monthly = [
    { month: "2026-02", granted: 1_000_000, spent: 126_860 },
    { month: "2026-08", granted: 1_000_000, spent: 21_335 },
  ];

  it("1月から12月までを必ず返す", () => {
    const views = buildMonthlyViews(monthly, 2026, "2026-08-31");

    expect(views).toHaveLength(12);
    expect(views[0].month).toBe("2026-01");
    expect(views[11].month).toBe("2026-12");
  });

  it("公開範囲の中は集計値を、支出が無い月も0円として公開扱いにする", () => {
    const views = buildMonthlyViews(monthly, 2026, "2026-08-31");

    expect(views[1]).toEqual({ month: "2026-02", granted: 1_000_000, spent: 126_860, published: true });
    expect(views[2]).toEqual({ month: "2026-03", granted: 0, spent: 0, published: true });
  });

  it("公開範囲より後の月は未公開にする（点線の空枠で描かれる）", () => {
    const views = buildMonthlyViews(monthly, 2026, "2026-08-31");

    expect(views[8].published).toBe(false);
    expect(views[11].published).toBe(false);
  });

  it("まだ何も公開していなければ全ての月が未公開になる", () => {
    const views = buildMonthlyViews(monthly, 2026, null);

    expect(views.every((view) => !view.published)).toBe(true);
    expect(views.every((view) => view.granted === 0 && view.spent === 0)).toBe(true);
  });
});
