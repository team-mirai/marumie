import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaGrantRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-grant.repository";
import type { GrantWrite } from "@/server/contexts/research-fund/domain/models/grant-registration";

const input: GrantWrite = {
  entryDate: "2026-05-01",
  description: "調査研究費 5月分",
  amount: 1_000_000,
  hash: "hash",
  lines: [
    { side: "debit", accountKey: "bank", amount: 1_000_000 },
    { side: "credit", accountKey: "grant-income", amount: 1_000_000 },
  ],
};
function setup(duplicates = 0) {
  const tx = {
    researchFundJournalEntry: {
      count: jest.fn().mockResolvedValue(duplicates),
      create: jest.fn().mockResolvedValue({ id: BigInt("9007199254740993") }),
      findMany: jest.fn().mockResolvedValue([
        { entryDate: new Date("2026-02-08T00:00:00.000Z") },
        { entryDate: new Date("2026-03-01T00:00:00.000Z") },
      ]),
    },
    researchFundBook: {
      findUnique: jest.fn().mockResolvedValue({
        financialYear: 2026,
        politician: { termStart: new Date("2026-02-08T00:00:00.000Z") },
      }),
    },
    researchFundAccount: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const transaction = jest.fn(async (fn: (client: unknown) => unknown) => fn(tx));
  const repository = new PrismaGrantRepository({
    ...tx,
    $transaction: transaction,
  } as unknown as PrismaClient);
  return { repository, tx, transaction };
}

test("帳簿から年度と議員の当選日を暦日で取り出す", async () => {
  const { repository, tx } = setup();
  await expect(repository.book("1")).resolves.toEqual({
    financialYear: 2026,
    termStart: "2026-02-08",
  });
  expect(tx.researchFundBook.findUnique).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: BigInt(1) } }),
  );
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.book("1")).resolves.toBeNull();
});

test("登録済みの支給を年月で返す", async () => {
  const { repository, tx } = setup();
  await expect(repository.registeredMonths("1")).resolves.toEqual(["2026-02", "2026-03"]);
  expect(tx.researchFundJournalEntry.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { bookId: BigInt(1), source: "grant" } }),
  );
});

test("同月の支給が無ければ確認済の支給仕訳を複式行つきで作る", async () => {
  const { repository, tx } = setup();
  await expect(repository.create("1", "2026-05", input, "user")).resolves.toBe("9007199254740993");
  expect(tx.researchFundJournalEntry.count).toHaveBeenCalledWith({
    where: {
      bookId: BigInt(1),
      source: "grant",
      entryDate: {
        gte: new Date("2026-05-01T00:00:00.000Z"),
        lt: new Date("2026-06-01T00:00:00.000Z"),
      },
    },
  });
  expect(tx.researchFundJournalEntry.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      bookId: BigInt(1),
      entryDate: new Date("2026-05-01T00:00:00.000Z"),
      status: "approved",
      source: "grant",
      hash: "hash",
      createdById: "user",
      lines: { create: input.lines },
    }),
  });
});

test("同一トランザクション内で同月の二重生成を拒否する", async () => {
  const { repository, tx } = setup(1);
  await expect(repository.create("1", "2026-05", input, "user")).rejects.toThrow("すでに登録");
  expect(tx.researchFundJournalEntry.create).not.toHaveBeenCalled();
});

test("同月の判定と作成は直列化トランザクションで行い、衝突はやり直せるエラーに変換する", async () => {
  const { repository, transaction } = setup();
  transaction.mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "test" }),
  );
  await expect(repository.create("1", "2026-05", input, "user")).rejects.toThrow("競合しました");
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
});

test("同月の判定をすり抜けて同時に登録された一意制約違反も、すでに登録済みのエラーにする", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.create.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
  );
  await expect(repository.create("1", "2026-05", input, "user")).rejects.toThrow("すでに登録");
});

test("一意制約以外のエラーはそのまま投げる", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.create.mockRejectedValue(new Error("connection lost"));
  await expect(repository.create("1", "2026-05", input, "user")).rejects.toThrow("connection lost");
});

test("12月の支給は翌年1月との境界で判定する", async () => {
  const { repository, tx } = setup();
  await repository.create("1", "2026-12", { ...input, entryDate: "2026-12-01" }, "user");
  expect(tx.researchFundJournalEntry.count.mock.calls[0][0].where.entryDate).toEqual({
    gte: new Date("2026-12-01T00:00:00.000Z"),
    lt: new Date("2027-01-01T00:00:00.000Z"),
  });
});
