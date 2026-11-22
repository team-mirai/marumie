import { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";

const snapshot = (
  id: string,
  snapshotDate: string,
  createdAt: string,
): BalanceSnapshot => ({
  id,
  political_organization_id: "org-1",
  snapshot_date: new Date(snapshotDate),
  balance: 1000,
  created_at: new Date(createdAt),
  updated_at: new Date(createdAt),
});

describe("BalanceSnapshot.validateSnapshotDate", () => {
  // 日本時間 2026-11-22 00:00（UTC では前日 15:00）
  const justAfterJstMidnight = new Date("2026-11-21T15:00:00.000Z");
  // 日本時間 2026-11-21 23:59:59（UTC では同日 14:59:59）
  const justBeforeJstMidnight = new Date("2026-11-21T14:59:59.999Z");

  it("今日より前の日付は登録できる", () => {
    expect(
      BalanceSnapshot.validateSnapshotDate(new Date("2026-11-01"), justAfterJstMidnight),
    ).toBeNull();
  });

  it("日本時間で日付が変わった直後は、その日付を今日として登録できる（UTC ではまだ前日）", () => {
    expect(
      BalanceSnapshot.validateSnapshotDate(new Date("2026-11-22"), justAfterJstMidnight),
    ).toBeNull();
  });

  it("日本時間で日付が変わる直前は、翌日の日付を未来として却下する", () => {
    expect(
      BalanceSnapshot.validateSnapshotDate(new Date("2026-11-22"), justBeforeJstMidnight),
    ).toBe("未来の日付は登録できません");
  });

  it("日本時間の明日以降は却下する", () => {
    expect(
      BalanceSnapshot.validateSnapshotDate(new Date("2026-11-23"), justAfterJstMidnight),
    ).toBe("未来の日付は登録できません");
  });

  it("日付として読めない値は却下しない（形式の検証に任せる）", () => {
    expect(
      BalanceSnapshot.validateSnapshotDate(new Date("not-a-date"), justAfterJstMidnight),
    ).toBeNull();
  });
});

describe("BalanceSnapshot.current", () => {
  it("1 件も無ければ null", () => {
    expect(BalanceSnapshot.current([])).toBeNull();
  });

  it("並び順に関係なく、残高日付が最も新しいものを選ぶ", () => {
    const older = snapshot("1", "2026-03-31", "2026-04-10T00:00:00Z");
    const newer = snapshot("2", "2026-06-30", "2026-04-01T00:00:00Z");

    expect(BalanceSnapshot.current([older, newer])).toBe(newer);
    expect(BalanceSnapshot.current([newer, older])).toBe(newer);
  });

  it("残高日付が同じなら、後から登録したものを選ぶ", () => {
    const first = snapshot("1", "2026-06-30", "2026-07-01T00:00:00Z");
    const second = snapshot("2", "2026-06-30", "2026-07-02T00:00:00Z");

    expect(BalanceSnapshot.current([first, second])).toBe(second);
    expect(BalanceSnapshot.current([second, first])).toBe(second);
  });
});
