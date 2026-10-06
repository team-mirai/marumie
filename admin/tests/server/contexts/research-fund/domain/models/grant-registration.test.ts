import {
  grantDescription,
  grantEntryDate,
  validateGrantAmount,
  validateGrantEntryDate,
} from "@/server/contexts/research-fund/domain/models/grant-registration";

test("当選月は当選日、以降は毎月1日を仕訳日にする", () => {
  expect(grantEntryDate("2026-02", "2026-02-08")).toBe("2026-02-08");
  expect(grantEntryDate("2026-03", "2026-02-08")).toBe("2026-03-01");
  expect(grantEntryDate("2027-02", "2026-02-08")).toBe("2027-02-01");
});

test("項目名は公開用に月を示す", () => {
  expect(grantDescription("2026-05")).toBe("調査研究広報滞在費 5月分");
  expect(grantDescription("2026-12")).toBe("調査研究広報滞在費 12月分");
});

describe("validateGrantEntryDate", () => {
  test("その月の実在する日付を受け付ける", () => {
    expect(validateGrantEntryDate("2026-05", "2026-02-08", "2026-05-01")).toEqual({
      status: "valid",
      value: "2026-05-01",
    });
    expect(validateGrantEntryDate("2026-05", "2026-02-08", "2026-05-31")).toEqual({
      status: "valid",
      value: "2026-05-31",
    });
    // 当選月は当選日以降なら受け付ける
    expect(validateGrantEntryDate("2026-02", "2026-02-08", "2026-02-08")).toEqual({
      status: "valid",
      value: "2026-02-08",
    });
    expect(validateGrantEntryDate("2026-02", "2026-02-08", "2026-02-20")).toEqual({
      status: "valid",
      value: "2026-02-20",
    });
  });

  test.each(["2026-04-30", "2026-06-01", "2027-05-01", "2025-05-01"])(
    "その月に属さない日付 %s を拒否する",
    (entryDate) => {
      const result = validateGrantEntryDate("2026-05", "2026-02-08", entryDate);
      expect(result.status).toBe("invalid");
      expect(result.status === "invalid" && result.errors[0].message).toContain("その月の日付");
    },
  );

  test.each(["2026-02-30", "2026-02-31", "2026-13-01", "2026-2-8", "2026/02/08", "", "きょう"])(
    "実在しない日付・形式不正 %s を拒否する",
    (entryDate) => {
      const result = validateGrantEntryDate("2026-02", "2026-02-08", entryDate);
      expect(result.status).toBe("invalid");
      expect(result.status === "invalid" && result.errors[0].message).toContain("実在する日");
    },
  );

  test("当選月で当選日より前の日付を拒否する（在職前の収入を計上しない）", () => {
    const result = validateGrantEntryDate("2026-02", "2026-02-08", "2026-02-07");
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.errors[0].message).toContain("当選日以降");
  });

  test("当選月以外は1日も受け付ける（当選日は下限にならない）", () => {
    expect(validateGrantEntryDate("2026-03", "2026-02-08", "2026-03-01").status).toBe("valid");
  });
});

test.each([1, 733_333, 1_000_000])("1円以上の整数の支給額 %p を受け付ける", (amount) => {
  expect(validateGrantAmount(amount)).toEqual({ status: "valid", value: amount });
});
test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "1000000", null, undefined])(
  "不正な支給額 %p を拒否する",
  (amount) => {
    expect(validateGrantAmount(amount)).toMatchObject({
      status: "invalid",
      errors: [{ path: "amount", code: "RF_INVALID_AMOUNT" }],
    });
  },
);
