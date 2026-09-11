import { ManageGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-grants-usecase";

const accounts = [
  { key: "grant-income", type: "income" as const },
  { key: "bank", type: "asset" as const },
];
function setup(overrides: { termStart?: string; registeredMonths?: string[] } = {}) {
  const repository = {
    book: jest.fn().mockResolvedValue({
      financialYear: 2026,
      termStart: overrides.termStart ?? "2026-02-08",
    }),
    registeredMonths: jest.fn().mockResolvedValue(overrides.registeredMonths ?? []),
    accounts: jest.fn().mockResolvedValue(accounts),
    create: jest.fn().mockResolvedValue("10"),
  };
  return { repository, usecase: new ManageGrantsUsecase(repository) };
}

test("当選月以降だけを並べ、当選月は日割・当月まで登録可能にする", async () => {
  const { usecase } = setup({ registeredMonths: ["2026-02"] });
  const { grants, termStart } = await usecase.list("1", "2026-09-10");
  expect(termStart).toBe("2026-02-08");
  expect(grants[0]).toEqual({ month: "2026-02", amount: 750_000, status: "registered" });
  expect(grants.map((grant) => grant.status)).toEqual([
    "registered", "available", "available", "available", "available", "available",
    "available", "available", "upcoming", "upcoming", "upcoming",
  ]);
});

test("支給は下書きを経ず確認済で、借方 普通預金／貸方 調査研究費収入の複式行を作る", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.register("1", "2026-05", "user", "2026-09-10")).resolves.toBe("10");
  expect(repository.create).toHaveBeenCalledWith(
    "1",
    "2026-05",
    {
      entryDate: "2026-05-01",
      description: "調査研究費 5月分",
      amount: 1_000_000,
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      lines: [
        { side: "debit", accountKey: "bank", amount: 1_000_000 },
        { side: "credit", accountKey: "grant-income", amount: 1_000_000 },
      ],
    },
    "user",
  );
});

test("当選月は当選日を仕訳日にし、日割の金額で作る", async () => {
  const { repository, usecase } = setup();
  await usecase.register("1", "2026-02", "user", "2026-09-10");
  expect(repository.create.mock.calls[0][2]).toMatchObject({
    entryDate: "2026-02-08",
    amount: 750_000,
  });
});

test("同月の二重生成・未到来・年度外・不正な月は拒否する", async () => {
  const registered = setup({ registeredMonths: ["2026-05"] });
  await expect(registered.usecase.register("1", "2026-05", "user", "2026-09-10")).rejects.toThrow(
    "すでに登録",
  );
  const { repository, usecase } = setup();
  await expect(usecase.register("1", "2026-10", "user", "2026-09-10")).rejects.toThrow("到来");
  await expect(usecase.register("1", "2026-01", "user", "2026-09-10")).rejects.toThrow("支給のない月");
  await expect(usecase.register("1", "2027-05", "user", "2026-09-10")).rejects.toThrow("支給のない月");
  await expect(usecase.register("1", "2026-13", "user", "2026-09-10")).rejects.toThrow("YYYY-MM");
  expect(repository.create).not.toHaveBeenCalled();
  expect(registered.repository.create).not.toHaveBeenCalled();
});

test("帳簿・科目が見つからない場合は作成しない", async () => {
  const missingBook = setup();
  missingBook.repository.book.mockResolvedValue(null);
  await expect(missingBook.usecase.list("1", "2026-09-10")).rejects.toThrow("帳簿が見つかりません");
  const missingAccount = setup();
  missingAccount.repository.accounts.mockResolvedValue([{ key: "bank", type: "asset" }]);
  await expect(
    missingAccount.usecase.register("1", "2026-05", "user", "2026-09-10"),
  ).rejects.toThrow("科目が見つかりません");
  expect(missingAccount.repository.create).not.toHaveBeenCalled();
});
