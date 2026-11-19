import {
  INVALID_JOURNAL_AMOUNT_MESSAGE,
  isJournalAmount,
  MAX_JOURNAL_AMOUNT,
} from "@/server/contexts/research-fund/domain/models/journal-amount";

describe("isJournalAmount", () => {
  test("上限ちょうどは受け付け、超えたら受け付けない", () => {
    expect(isJournalAmount(MAX_JOURNAL_AMOUNT)).toBe(true);
    expect(isJournalAmount(MAX_JOURNAL_AMOUNT + 1)).toBe(false);
  });

  test("下限は1円。0円以下は受け付けない", () => {
    expect(isJournalAmount(1)).toBe(true);
    expect(isJournalAmount(0)).toBe(false);
    expect(isJournalAmount(-1)).toBe(false);
  });

  test.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "整数でない金額 %p は受け付けない",
    (amount) => {
      expect(isJournalAmount(amount)).toBe(false);
    },
  );
});

test("上限は DB の Decimal(12, 0) に合わせた12桁", () => {
  expect(MAX_JOURNAL_AMOUNT).toBe(999_999_999_999);
  expect(INVALID_JOURNAL_AMOUNT_MESSAGE).toBe(
    "金額は1円以上999999999999円以下の整数で指定してください",
  );
});
