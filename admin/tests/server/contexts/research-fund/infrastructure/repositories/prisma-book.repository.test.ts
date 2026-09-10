import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaBookRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-book.repository";
function setup() {
  const table = { findMany: jest.fn(), create: jest.fn(), update: jest.fn() };
  return { table, repository: new PrismaBookRepository({ researchFundBook: table } as unknown as PrismaClient) };
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
