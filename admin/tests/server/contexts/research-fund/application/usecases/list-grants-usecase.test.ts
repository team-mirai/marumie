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

test("帳簿が無ければ登録済みの支給を引かずに弾く", async () => {
  const { repository, usecase } = setup();
  repository.book.mockResolvedValue(null);
  await expect(usecase.execute("1", "2026-09-10")).rejects.toThrow("帳簿が見つかりません");
  expect(repository.registeredGrants).not.toHaveBeenCalled();
});
