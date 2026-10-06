import { isEmphasizedJournalAmount } from "@/client/lib/research-fund-journal-amount";

test("1 万円未満は強調しない", () => {
  expect(isEmphasizedJournalAmount(9_999)).toBe(false);
});

test("1 万円ちょうどは強調する", () => {
  expect(isEmphasizedJournalAmount(10_000)).toBe(true);
});

test("1 万円を超える額は強調する", () => {
  expect(isEmphasizedJournalAmount(10_001)).toBe(true);
  expect(isEmphasizedJournalAmount(1_234_567)).toBe(true);
});

test("1 円でも強調しない", () => {
  expect(isEmphasizedJournalAmount(1)).toBe(false);
});
