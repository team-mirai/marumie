import { getBalanceSheetAsOf } from "@/client/lib/balance-sheet-heading";

describe("getBalanceSheetAsOf", () => {
  const now = new Date("2026-09-28T03:00:00Z");

  it("過去年度では年度末の基準日を出す", () => {
    expect(getBalanceSheetAsOf(2025, "2026.9.28更新", now)).toBe("2025.12.31時点");
  });

  it("現在年度では更新日時をそのまま出す", () => {
    expect(getBalanceSheetAsOf(2026, "2026.9.28更新", now)).toBe("2026.9.28更新");
  });

  it("年の切り替わりは日本時間で判定する", () => {
    // UTC では 2025-12-31 だが日本時間では 2026-01-01
    const newYearInJapan = new Date("2025-12-31T15:30:00Z");

    expect(getBalanceSheetAsOf(2025, "2026.1.1更新", newYearInJapan)).toBe("2025.12.31時点");
  });
});
