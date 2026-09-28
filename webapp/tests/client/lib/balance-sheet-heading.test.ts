import { getBalanceSheetHeading } from "@/client/lib/balance-sheet-heading";

describe("getBalanceSheetHeading", () => {
  const now = new Date("2026-09-28T03:00:00Z");

  it("過去年度では年度末の基準日を見出しと日付表示に出す", () => {
    expect(getBalanceSheetHeading(2025, "2026.9.28時点", now)).toEqual({
      title: "2025年12月31日時点の貸借対照表",
      updatedAt: "2025.12.31時点",
    });
  });

  it("現在年度では従来どおり「現時点での」表記と更新日時を出す", () => {
    expect(getBalanceSheetHeading(2026, "2026.9.28時点", now)).toEqual({
      title: "現時点での貸借対照表",
      updatedAt: "2026.9.28時点",
    });
  });

  it("年の切り替わりは日本時間で判定する", () => {
    // UTC では 2025-12-31 だが日本時間では 2026-01-01
    const newYearInJapan = new Date("2025-12-31T15:30:00Z");

    expect(getBalanceSheetHeading(2025, "", newYearInJapan).title).toBe(
      "2025年12月31日時点の貸借対照表",
    );
  });
});
