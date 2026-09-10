import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";

const base: GrantSchedule = {
  termStart: "2026-02-01",
  financialYear: 2026,
  referenceDate: "2026-09-10",
  registeredMonths: [],
};

function schedule(overrides: Partial<GrantSchedule> = {}) {
  const result = GrantSchedule.generate({ ...base, ...overrides });
  if (result.status !== "valid") throw new Error(JSON.stringify(result.errors));
  return result.value;
}

describe("GrantSchedule.generate", () => {
  it("当選月より前を除外し、12月まで毎月100万円の予定を返す", () => {
    const grants = schedule();
    expect(grants.map((grant) => grant.month)).toEqual([
      "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
      "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(grants.every((grant) => grant.amount === 1_000_000)).toBe(true);
  });

  it.each([
    ["2026-02-15", 500_000],
    ["2024-02-15", 517_241],
    ["2026-04-16", 500_000],
    ["2026-07-16", 516_129],
    ["2026-02-28", 35_714],
    ["2024-02-29", 34_482],
    ["2026-12-31", 32_258],
    ["2026-01-01", 1_000_000],
  ])("%s の当選日を含め暦月の日数で按分し端数を切り捨てる", (termStart, amount) => {
    const grants = schedule({ termStart, financialYear: Number(termStart.slice(0, 4)) });
    expect(grants[0].amount).toBe(amount);
    expect(grants.slice(1).every((grant) => grant.amount === 1_000_000)).toBe(true);
  });

  it("翌年度は1月から満額、当選前の年度は対象なし", () => {
    const grants = schedule({ financialYear: 2027 });
    expect(grants).toHaveLength(12);
    expect(grants[0]).toEqual({ month: "2027-01", amount: 1_000_000, status: "upcoming" });
    expect(schedule({ financialYear: 2025 })).toEqual([]);
  });

  it("登録済みを優先し、過去・当月の未登録分は登録可能、翌月以降は未到来", () => {
    const registeredMonths = Object.freeze(["2026-02", "2026-02", "2026-10", "2025-03"]);
    const grants = schedule({ registeredMonths });
    expect(grants.map((grant) => grant.status)).toEqual([
      "registered", "available", "available", "available", "available", "available",
      "available", "available", "registered", "upcoming", "upcoming",
    ]);
    expect(registeredMonths).toHaveLength(4);
  });

  it("当選月でも当選日前には登録できず、当日から登録可能", () => {
    expect(schedule({ termStart: "2026-02-15", referenceDate: "2026-02-14" })[0].status).toBe("upcoming");
    expect(schedule({ termStart: "2026-02-15", referenceDate: "2026-02-15" })[0].status).toBe("available");
  });

  it("月末から翌月1日、年末から翌年1日に登録可能な月が増える", () => {
    expect(schedule({ referenceDate: "2026-08-31" })[7].status).toBe("upcoming");
    expect(schedule({ referenceDate: "2026-09-01" })[7].status).toBe("available");
    expect(schedule({ financialYear: 2027, referenceDate: "2026-12-31" })[0].status).toBe("upcoming");
    expect(schedule({ financialYear: 2027, referenceDate: "2027-01-01" })[0].status).toBe("available");
  });

  it.each(["2026-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "0000-01-01", "2026-2-01", "invalid", "2026-02-01T00:00:00Z"])("不正な暦日 %s を拒否する", (date) => {
    for (const path of ["termStart", "referenceDate"] as const) {
      expect(GrantSchedule.generate({ ...base, [path]: date })).toMatchObject({
        status: "invalid", errors: [{ path, code: "RF_INVALID_DATE", severity: "error" }],
      });
    }
  });

  it.each([0, -1, 2026.5, 10000, Number.NaN, Number.POSITIVE_INFINITY])("不正な年度 %s を拒否する", (financialYear) => {
    expect(GrantSchedule.generate({ ...base, financialYear }).status).toBe("invalid");
  });

  it.each(["2026-00", "2026-13", "2026-2", "2026-02-01", "0000-01", "invalid"])("不正な登録月 %s を拒否する", (month) => {
    expect(GrantSchedule.generate({ ...base, registeredMonths: [month] })).toMatchObject({
      status: "invalid", errors: [{ path: "registeredMonths.0", code: "RF_INVALID_DATE" }],
    });
  });
});
