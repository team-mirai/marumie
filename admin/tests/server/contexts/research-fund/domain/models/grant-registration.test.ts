import {
  grantDescription,
  grantEntryDate,
  isGrantMonth,
  japanCalendarDate,
} from "@/server/contexts/research-fund/domain/models/grant-registration";

test.each(["2026-01", "2026-12"])("年月 %s を受け付ける", (month) => {
  expect(isGrantMonth(month)).toBe(true);
});
test.each(["2026-00", "2026-13", "2026-1", "2026-01-01", "", "abcd-01"])(
  "不正な年月 %s を拒否する",
  (month) => {
    expect(isGrantMonth(month)).toBe(false);
  },
);

test("日本時間の暦日で支給日を判定する（UTCの前日扱いを避ける）", () => {
  expect(japanCalendarDate(new Date("2026-09-01T00:30:00.000Z"))).toBe("2026-09-01");
  expect(japanCalendarDate(new Date("2026-08-31T15:00:00.000Z"))).toBe("2026-09-01");
  expect(japanCalendarDate(new Date("2026-08-31T14:59:59.000Z"))).toBe("2026-08-31");
});

test("当選月は当選日、以降は毎月1日を仕訳日にする", () => {
  expect(grantEntryDate("2026-02", "2026-02-08")).toBe("2026-02-08");
  expect(grantEntryDate("2026-03", "2026-02-08")).toBe("2026-03-01");
  expect(grantEntryDate("2027-02", "2026-02-08")).toBe("2027-02-01");
});

test("項目名は公開用に月を示す", () => {
  expect(grantDescription("2026-05")).toBe("調査研究費 5月分");
  expect(grantDescription("2026-12")).toBe("調査研究費 12月分");
});
