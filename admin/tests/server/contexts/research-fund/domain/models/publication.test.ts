import { Publication } from "@/server/contexts/research-fund/domain/models/publication";

test("公開範囲を公開した仕訳の最新月末まで進める", () => {
  expect(Publication.advancePublishedThrough(null, ["2026-08-13", "2026-07-01"])).toBe("2026-08-31");
  expect(Publication.advancePublishedThrough("2026-06-30", ["2026-02-08"])).toBe("2026-06-30");
  expect(Publication.advancePublishedThrough("2026-06-30", ["2026-07-31"])).toBe("2026-07-31");
});

test("うるう年の2月と12月の月末を暦どおりに求める", () => {
  expect(Publication.advancePublishedThrough(null, ["2028-02-01"])).toBe("2028-02-29");
  expect(Publication.advancePublishedThrough(null, ["2026-02-01"])).toBe("2026-02-28");
  expect(Publication.advancePublishedThrough(null, ["2026-12-25"])).toBe("2026-12-31");
});

test("公開する仕訳が無ければ公開範囲は変えない", () => {
  expect(Publication.advancePublishedThrough("2026-06-30", [])).toBe("2026-06-30");
  expect(Publication.advancePublishedThrough(null, [])).toBeNull();
});
