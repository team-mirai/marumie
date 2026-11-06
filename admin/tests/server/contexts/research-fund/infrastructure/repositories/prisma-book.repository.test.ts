import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
function setup() {
  const table = { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
  const accounts = {
    findMany: jest.fn().mockResolvedValue([
      { legalCategoryKey: "office", legalLabel: "④ 事務所費" },
      { legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
    ]),
  };
  const overrides = { count: jest.fn().mockResolvedValue(0) };
  return {
    table,
    accounts,
    overrides,
    repository: new PrismaBookRepository({
      researchFundBook: table,
      researchFundAccount: accounts,
      researchFundLegalCategoryOverride: overrides,
    } as unknown as PrismaClient),
  };
}
function line(key: string, type: string, side: string, amount: number) {
  return { accountKey: key, side, amount: new Prisma.Decimal(amount), account: { type, label: key, legalLabel: "区分" } };
}
test("借貸の二重計上、下書き・返還の混入を避け、draft件数は仕訳単位で数える", async () => {
  const { table, repository } = setup();
  const entry = (status: string, lines: unknown[]) => ({ status, entryDate: new Date("2026-08-01"), lines });
  table.findMany.mockResolvedValue([{
    id: BigInt(2), financialYear: 2026, status: "active", publishedThrough: new Date("2026-08-31"),
    asOfDate: null, nextUpdateNote: null, policyComment: "方針",
    journalEntries: [
      entry("approved", [line("bank", "asset", "debit", 1000000), line("grant-income", "income", "credit", 1000000)]),
      entry("published", [line("taxi", "expense", "debit", 1200), line("books", "expense", "debit", 800), line("bank", "asset", "credit", 2000)]),
      entry("draft", [line("taxi", "expense", "debit", 900), line("bank", "asset", "credit", 900)]),
      entry("approved", [line("grant-income", "income", "debit", 100), line("bank", "asset", "credit", 100)]),
    ],
  }]);
  const [result] = await repository.list("1");
  expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { politicianId: BigInt(1) }, orderBy: { financialYear: "desc" } }));
  expect(result.book).toEqual({ id: "2", financialYear: 2026, status: "active", publishedThrough: "2026-08-31", asOfDate: "", nextUpdateNote: "", policyComment: "方針" });
  expect(result.draftCount).toBe(1);
  expect(result.rows).toEqual([
    { date: "2026-08-01", accountKey: "grant-income", amount: 1000000, type: "grant" },
    { date: "2026-08-01", accountKey: "taxi", amount: 1200, type: "expense" },
    { date: "2026-08-01", accountKey: "books", amount: 800, type: "expense" },
  ]);
});
test("作成には公開状態などを指定せず、DBの一意制約違反を変換する", async () => {
  const { table, repository } = setup();
  await repository.create("1", 2026);
  expect(table.create).toHaveBeenCalledWith({ data: { politicianId: BigInt(1), financialYear: 2026 } });
  table.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  await expect(repository.create("1", 2026)).rejects.toThrow("既に存在");
});
test("更新は議員と帳簿の両方で絞り、指定したメタデータだけ保存する", async () => {
  const { table, repository } = setup();
  await repository.update("1", "2", { asOfDate: "2026-08-20", nextUpdateNote: "11月", policyComment: "方針" });
  expect(table.update).toHaveBeenCalledWith({ where: { id: BigInt(2), politicianId: BigInt(1) }, data: { asOfDate: new Date("2026-08-20"), nextUpdateNote: "11月", policyComment: "方針" } });
  await repository.update("1", "2", { asOfDate: "", nextUpdateNote: "", policyComment: "" });
  expect(table.update).toHaveBeenLastCalledWith({ where: { id: BigInt(2), politicianId: BigInt(1) }, data: { asOfDate: null, nextUpdateNote: null, policyComment: null } });
});
test("内部の保存エラーは公開しない", async () => {
  const { table, repository } = setup();
  table.create.mockRejectedValue(new Error("internal detail"));
  table.update.mockRejectedValue(new Error("internal detail"));
  await expect(repository.create("1", 2026)).rejects.toThrow("帳簿の作成に失敗");
  await expect(repository.update("1", "2", { asOfDate: "", nextUpdateNote: "", policyComment: "" })).rejects.toThrow("帳簿の保存に失敗");
});

test("未公開の帳簿と任意項目を一覧表示用に変換し、法定区分なしの科目も保持する", async () => {
  const { table, repository } = setup();
  const expenseLine = line("taxi", "expense", "debit", 1200);
  table.findMany.mockResolvedValue([{
    id: BigInt(3), financialYear: 2025, status: "preparing", publishedThrough: null,
    asOfDate: new Date("2025-12-31"), nextUpdateNote: "来月更新", policyComment: null,
    allowLegalCategoryOverride: false,
    journalEntries: [{
      status: "approved", entryDate: new Date("2025-12-01"),
      lines: [{ ...expenseLine, account: { ...expenseLine.account, legalLabel: null } }],
    }],
  }]);
  await expect(repository.list("1")).resolves.toEqual([{
    book: {
      id: "3", financialYear: 2025, status: "preparing", publishedThrough: null,
      asOfDate: "2025-12-31", nextUpdateNote: "来月更新", policyComment: "",
    },
    draftCount: 0,
    legalCategoryOverride: { allowed: false, count: 0 },
    rows: [{ date: "2025-12-01", accountKey: "taxi", amount: 1200, type: "expense" }],
    accounts: { taxi: { label: "taxi", legalLabel: "" } },
  }]);
});

test("一意制約以外のPrismaエラーは重複と誤認せず作成失敗を返す", async () => {
  const { table, repository } = setup();
  table.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("foreign key", {
    code: "P2003", clientVersion: "test",
  }));
  await expect(repository.create("1", 2026)).rejects.toThrow("帳簿の作成に失敗");
});

describe("法定区分の上書き（#1880）", () => {
  const book = (journalEntries: unknown[], allowLegalCategoryOverride = true) => ({
    id: BigInt(3), financialYear: 2025, status: "active", publishedThrough: null,
    asOfDate: null, nextUpdateNote: null, policyComment: null, allowLegalCategoryOverride, journalEntries,
  });
  const expense = (status: string, override: string | null) => ({
    status, entryDate: new Date("2025-12-01"),
    lines: [line("ai-tools", "expense", "debit", 3000), line("bank", "asset", "credit", 3000)],
    legalCategoryOverride: override === null ? null : { legalCategoryKey: override, reason: "提出済みの報告書に合わせる" },
  });

  test("一覧に許可と上書き中の件数を添え、集計行に上書き先の区分を添える", async () => {
    const { table, repository } = setup();
    table.findMany.mockResolvedValue([book([expense("approved", "research"), expense("draft", "research"), expense("approved", null)])]);
    const [result] = await repository.list("1");
    // 下書きの上書きも件数には数える（許可を取り消せるかの判断に使う）
    expect(result.legalCategoryOverride).toEqual({ allowed: true, count: 2 });
    expect(result.rows).toEqual([
      { date: "2025-12-01", accountKey: "ai-tools", amount: 3000, type: "expense", legalCategoryOverride: { key: "research", label: "⑦ 調査研究費" } },
      { date: "2025-12-01", accountKey: "ai-tools", amount: 3000, type: "expense" },
    ]);
  });

  test("上書きが1件も無ければ科目マスタを読まない", async () => {
    const { table, accounts, repository } = setup();
    table.findMany.mockResolvedValue([book([expense("approved", null)], false)]);
    await repository.list("1");
    expect(accounts.findMany).not.toHaveBeenCalled();
  });

  test("許可の取り消しは、上書き中の仕訳が残っていないことを同じ文の条件で確かめる", async () => {
    const { table, repository } = setup();
    await repository.setLegalCategoryOverrideAllowed("1", "2", false);
    expect(table.updateMany).toHaveBeenCalledWith({
      where: {
        id: BigInt(2), politicianId: BigInt(1),
        journalEntries: { none: { legalCategoryOverride: { isNot: null } } },
      },
      data: { allowLegalCategoryOverride: false },
    });
    await repository.setLegalCategoryOverrideAllowed("1", "2", true);
    expect(table.updateMany).toHaveBeenLastCalledWith({
      where: { id: BigInt(2), politicianId: BigInt(1) },
      data: { allowLegalCategoryOverride: true },
    });
  });

  test("取り消しの条件に合わなければ（判定のあとに上書きされた場合を含む）変更せずに伝える", async () => {
    const { table, repository } = setup();
    table.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.setLegalCategoryOverrideAllowed("1", "2", false)).rejects.toThrow("画面を再読み込み");
  });

  test("上書き中の件数は議員と帳簿の両方で絞り、帳簿が無ければ null", async () => {
    const { table, overrides, repository } = setup();
    table.findFirst.mockResolvedValue({ id: BigInt(2) });
    overrides.count.mockResolvedValue(4);
    await expect(repository.legalCategoryOverrideCount("1", "2")).resolves.toBe(4);
    expect(table.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: BigInt(2), politicianId: BigInt(1) } }));
    expect(overrides.count).toHaveBeenCalledWith({ where: { entry: { bookId: BigInt(2) } } });
    table.findFirst.mockResolvedValue(null);
    await expect(repository.legalCategoryOverrideCount("9", "2")).resolves.toBeNull();
  });
});
