import { formatAsOfDate, formatUpdatedAt } from "@/client/lib/format-date";

describe("formatUpdatedAt", () => {
  it("should return empty string when date is null", () => {
    expect(formatUpdatedAt(null)).toBe("");
  });

  it("should format date correctly in Japanese locale", () => {
    const dateString = "2025-01-15T10:30:00Z";
    const result = formatUpdatedAt(dateString);
    expect(result).toBe("2025.1.15 更新");
  });

  it("should handle different date formats", () => {
    const dateString = "2024-12-25T15:45:30Z";
    const result = formatUpdatedAt(dateString);
    expect(result).toBe("2024.12.26 更新");
  });

  it("should handle single digit months and days", () => {
    const dateString = "2025-03-05T08:15:00Z";
    const result = formatUpdatedAt(dateString);
    expect(result).toBe("2025.3.5 更新");
  });

  it("should handle leap year dates", () => {
    const dateString = "2024-02-29T12:00:00Z";
    const result = formatUpdatedAt(dateString);
    expect(result).toBe("2024.2.29 更新");
  });

  it("数字と「更新」の間に半角スペースを入れる（v9）", () => {
    expect(formatUpdatedAt("2026-10-23T00:00:00+09:00")).toBe("2026.10.23 更新");
  });
});

describe("formatAsOfDate", () => {
  it("日本時間の日付で「〜時点」の見た目と読み上げを返す", () => {
    // UTC 11/15 16:00 は日本時間 11/16 の 1:00
    expect(formatAsOfDate(new Date("2026-11-15T16:00:00Z"))).toEqual({
      text: "2026.11.16時点",
      spoken: "2026年11月16日時点",
    });
  });

  it("月・日をゼロ埋めしない", () => {
    expect(formatAsOfDate(new Date("2026-03-05T03:00:00Z")).text).toBe("2026.3.5時点");
  });
});
