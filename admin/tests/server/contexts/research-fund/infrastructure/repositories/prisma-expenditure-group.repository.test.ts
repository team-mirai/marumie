import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaExpenditureGroupRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-expenditure-group.repository";

function setup() {
  const journalEntry = { findMany: jest.fn(), count: jest.fn() };
  const $transaction = jest.fn();
  return {
    journalEntry,
    $transaction,
    repository: new PrismaExpenditureGroupRepository({
      researchFundJournalEntry: journalEntry,
      $transaction,
    } as unknown as PrismaClient),
  };
}

function line(type: string, amount: number) {
  return { accountKey: "taxi", side: "debit", amount: new Prisma.Decimal(amount), account: { type } };
}

test("費用の借方が複数ある仕訳は全明細を合計し、費用のない仕訳は除く", async () => {
  const { journalEntry, repository } = setup();
  journalEntry.findMany.mockResolvedValue([
    {
      id: BigInt(1),
      entryDate: new Date("2026-08-01"),
      description: "資料と交通費",
      lines: [line("expense", 1200), line("expense", 800)],
      groupItems: [{ groupId: BigInt(5) }],
    },
    {
      id: BigInt(2),
      entryDate: new Date("2026-08-02"),
      description: "費用明細なし",
      lines: [line("asset", 500)],
      groupItems: [],
    },
  ]);
  expect(await repository.entries("3")).toEqual([
    { id: "1", entryDate: "2026-08-01", description: "資料と交通費", amount: 2000, groupId: "5" },
  ]);
});

test("同時保存の直列化衝突は保存し直せるエラーに変換する", async () => {
  const { $transaction, repository } = setup();
  $transaction.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "test" }),
  );
  await expect(
    repository.create("3", { title: "t", description: "d", outcomes: [], entryIds: ["1"] }),
  ).rejects.toThrow("他の操作と競合しました");
  expect($transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
});

test("同じ仕訳が別の支出群へ同時に紐づけられたら entry_id の一意制約違反を選べないエラーに変換する", async () => {
  const { $transaction, repository } = setup();
  $transaction.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
  );
  await expect(
    repository.update("3", "5", { title: "t", description: "d", outcomes: [], entryIds: ["1"] }),
  ).rejects.toThrow("他の支出群に紐づいている仕訳は選べません");
});

test("一意制約と直列化以外のエラーはそのまま投げる", async () => {
  const { $transaction, repository } = setup();
  $transaction.mockRejectedValue(new Error("connection lost"));
  await expect(
    repository.create("3", { title: "t", description: "d", outcomes: [], entryIds: [] }),
  ).rejects.toThrow("connection lost");
});

test("並べ替えも直列化トランザクションで行い、衝突は保存し直せるエラーに変換する", async () => {
  const { $transaction, repository } = setup();
  $transaction.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "test" }),
  );
  await expect(repository.reorder("3", ["2", "1"])).rejects.toThrow("他の操作と競合しました");
  expect($transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
});
