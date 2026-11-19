import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";

const base: GrantSchedule = {
  termStart: "2026-02-01",
  financialYear: 2026,
  referenceDate: "2026-09-10",
  registeredGrants: [],
};

/** 登録済みの月を、自動計算と同額で登録したものとして表す */
function registered(...months: string[]) {
  return months.map((month) => ({ month, amount: 1_000_000 }));
}

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
    const registeredGrants = Object.freeze(registered("2026-02", "2026-02", "2026-10", "2025-03"));
    const grants = schedule({ registeredGrants });
    expect(grants.map((grant) => grant.status)).toEqual([
      "registered", "available", "available", "available", "available", "available",
      "available", "available", "registered", "upcoming", "upcoming",
    ]);
    expect(registeredGrants).toHaveLength(4);
  });

  it("登録済みの月は自動計算の額ではなく登録した額を出し、未登録の月は自動計算のまま", () => {
    const grants = schedule({
      termStart: "2026-02-08",
      registeredGrants: [
        { month: "2026-02", amount: 750_000 },
        { month: "2026-03", amount: 980_000 },
      ],
    });
    expect(grants.slice(0, 3)).toEqual([
      { month: "2026-02", amount: 750_000, status: "registered" },
      { month: "2026-03", amount: 980_000, status: "registered" },
      { month: "2026-04", amount: 1_000_000, status: "available" },
    ]);
  });

  it("同じ月の登録が重複したら後の登録の額を採る", () => {
    const grants = schedule({
      registeredGrants: [
        { month: "2026-03", amount: 100_000 },
        { month: "2026-03", amount: 900_000 },
      ],
    });
    expect(grants[1]).toEqual({ month: "2026-03", amount: 900_000, status: "registered" });
  });

  it("登録した額が0円でも登録済みとして扱う", () => {
    const grants = schedule({ registeredGrants: [{ month: "2026-03", amount: 0 }] });
    expect(grants[1]).toEqual({ month: "2026-03", amount: 0, status: "registered" });
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
    expect(GrantSchedule.generate({ ...base, registeredGrants: registered(month) })).toMatchObject({
      status: "invalid", errors: [{ path: "registeredGrants.0.month", code: "RF_INVALID_DATE" }],
    });
  });
});

describe("GrantSchedule.registrable", () => {
  const grants = schedule({ registeredGrants: registered("2026-05") });

  function rejection(month: string) {
    const result = GrantSchedule.registrable(grants, month);
    return result.status === "invalid" ? result.errors[0].message : null;
  }

  it("支給日を迎えた未登録の月は、その月の予定を返す", () => {
    expect(GrantSchedule.registrable(grants, "2026-06")).toEqual({
      status: "valid",
      value: { month: "2026-06", amount: 1_000_000, status: "available" },
    });
  });

  it("登録済の月は登録できない", () => {
    expect(rejection("2026-05")).toBe("この月の支給はすでに登録されています");
  });

  it("支給日が来ていない月は登録できない", () => {
    expect(rejection("2026-10")).toBe("支給日が到来していません");
  });

  it("当選月より前・別の年度の月は登録できない", () => {
    expect(rejection("2026-01")).toBe("この年度に支給のない月です");
    expect(rejection("2027-05")).toBe("この年度に支給のない月です");
  });
});
