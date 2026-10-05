import { ListGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/list-grants-usecase";

const accounts = [
  { key: "grant-income", type: "income" as const },
  { key: "bank", type: "asset" as const },
];
function setup(
  overrides: { termStart?: string; registeredGrants?: { month: string; amount: number }[] } = {},
) {
  const repository = {
    book: jest.fn().mockResolvedValue({
      financialYear: 2026,
      termStart: overrides.termStart ?? "2026-02-08",
    }),
    registeredGrants: jest.fn().mockResolvedValue(overrides.registeredGrants ?? []),
    accounts: jest.fn().mockResolvedValue(accounts),
    create: jest.fn().mockResolvedValue("10"),
  };
  return { repository, usecase: new ListGrantsUsecase(repository) };
}

test("当選月以降だけを並べ、当選月は日割・当月まで登録可能にする", async () => {
  const { usecase } = setup({ registeredGrants: [{ month: "2026-02", amount: 750_000 }] });
  const { grants, termStart } = await usecase.execute("1", "2026-09-10");
  expect(termStart).toBe("2026-02-08");
  expect(grants[0]).toEqual({ month: "2026-02", amount: 750_000, status: "registered" });
  expect(grants.map((grant) => grant.status)).toEqual([
    "registered", "available", "available", "available", "available", "available",
    "available", "available", "upcoming", "upcoming", "upcoming",
  ]);
});

test("登録済みの月は、自動計算の額ではなく登録した金額で並べる", async () => {
  const { usecase } = setup({ registeredGrants: [{ month: "2026-03", amount: 980_000 }] });
  const { grants } = await usecase.execute("1", "2026-09-10");
  expect(grants.find((grant) => grant.month === "2026-03")).toEqual({
    month: "2026-03",
    amount: 980_000,
    status: "registered",
  });
  // 未登録の月は自動計算の額のまま
  expect(grants.find((grant) => grant.month === "2026-04")?.amount).toBe(1_000_000);
});
