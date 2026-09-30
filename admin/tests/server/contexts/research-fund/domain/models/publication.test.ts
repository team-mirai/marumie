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

test("取り下げ後の公開範囲は、残った公開中の仕訳の最新月末を超えない", () => {
  expect(Publication.retreatPublishedThrough("2027-04-30", "2026-09-12")).toBe("2026-09-30");
  expect(Publication.retreatPublishedThrough("2026-09-30", "2026-09-01")).toBe("2026-09-30");
  expect(Publication.retreatPublishedThrough("2026-08-31", "2026-09-01")).toBe("2026-08-31");
  expect(Publication.retreatPublishedThrough(null, "2026-09-01")).toBeNull();
});

test("取り下げ後に公開中の仕訳が残っていなければ公開範囲は未設定", () => {
  expect(Publication.retreatPublishedThrough("2026-09-30", null)).toBeNull();
  expect(Publication.retreatPublishedThrough(null, null)).toBeNull();
});
