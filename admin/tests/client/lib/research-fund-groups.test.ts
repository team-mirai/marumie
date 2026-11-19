import { formatLinkedPeriod } from "@/client/lib/research-fund-groups";

test("期間が無ければダッシュを出す", () => {
  expect(formatLinkedPeriod(null)).toBe("—");
});

test("同じ日なら 1 つの日付にする", () => {
  expect(formatLinkedPeriod({ start: "2026-02-08", end: "2026-02-08" })).toBe("2026.02.08");
});

test("同じ年なら終わりの年を省く", () => {
  expect(formatLinkedPeriod({ start: "2026-02-08", end: "2026-05-14" })).toBe("2026.02.08 〜 05.14");
});

test("年をまたぐなら終わりも年から出す", () => {
  expect(formatLinkedPeriod({ start: "2025-12-28", end: "2026-01-05" })).toBe(
    "2025.12.28 〜 2026.01.05",
  );
});
