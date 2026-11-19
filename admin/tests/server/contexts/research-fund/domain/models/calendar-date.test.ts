import {
  isCalendarDate,
  isCalendarMonth,
  todayInJst,
} from "@/server/contexts/research-fund/domain/models/calendar-date";

describe("isCalendarDate", () => {
  test.each(["2026-01-01", "2026-12-31", "0000-01-01", "9999-12-31"])(
    "実在する暦日 %s を受け付ける",
    (value) => {
      expect(isCalendarDate(value)).toBe(true);
    },
  );

  test.each(["2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00"])(
    "存在しない日 %s を拒否する（繰り上げ解釈をそのまま通さない）",
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );

  test("うるう年の2月29日は、閏年だけ受け付ける", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2000-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    // 100で割れて400で割れない年は閏年ではない
    expect(isCalendarDate("1900-02-29")).toBe(false);
  });

  test.each(["", "2026-1-1", "2026/01/01", "2026-01-01T00:00:00Z", "abcd-01-01", " 2026-01-01"])(
    "YYYY-MM-DD 以外の形 %j を拒否する",
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );

  test("allowYearZero: false なら 0000 年を拒否する", () => {
    expect(isCalendarDate("0000-01-01", { allowYearZero: false })).toBe(false);
    expect(isCalendarDate("0001-01-01", { allowYearZero: false })).toBe(true);
  });
});

describe("isCalendarMonth", () => {
  test.each(["2026-01", "2026-12", "0000-01"])("実在する年月 %s を受け付ける", (value) => {
    expect(isCalendarMonth(value)).toBe(true);
  });

  test.each(["2026-00", "2026-13", "2026-1", "2026-01-01", "", "abcd-01"])(
    "不正な年月 %j を拒否する",
    (value) => {
      expect(isCalendarMonth(value)).toBe(false);
    },
  );

  test("allowYearZero: false なら 0000 年を拒否する", () => {
    expect(isCalendarMonth("0000-01", { allowYearZero: false })).toBe(false);
    expect(isCalendarMonth("0001-01", { allowYearZero: false })).toBe(true);
  });
});

describe("todayInJst", () => {
  test("日本時間の日付を返す（UTC では前日でも日本の今日を使う）", () => {
    expect(todayInJst(new Date("2026-10-05T23:00:00.000Z"))).toBe("2026-10-06");
    expect(todayInJst(new Date("2026-10-05T14:59:00.000Z"))).toBe("2026-10-05");
  });

  test("日付の境目は UTC 15:00（日本時間の 0:00）", () => {
    expect(todayInJst(new Date("2026-08-31T14:59:59.999Z"))).toBe("2026-08-31");
    expect(todayInJst(new Date("2026-08-31T15:00:00.000Z"))).toBe("2026-09-01");
    expect(todayInJst(new Date("2026-09-01T00:30:00.000Z"))).toBe("2026-09-01");
  });

  test("引数を省略すると現在時刻を使う", () => {
    expect(todayInJst()).toBe(todayInJst(new Date()));
  });
});
