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

test("紐づけ候補は支払先・科目・特記事項・書類・紐づけ先の支出群名を付けて返す", async () => {
  const { journalEntry, repository } = setup();
  journalEntry.findMany.mockResolvedValue([
    {
      id: BigInt(1),
      entryDate: new Date("2026-08-01"),
      description: "資料と交通費",
      note: "視察のため",
      memo: "事務所メモ",
      documentId: BigInt(9),
      lines: [
        { ...line("expense", 1200), account: { type: "expense", label: "交通費" } },
        { ...line("expense", 800), account: { type: "expense", label: "交通費" } },
        { ...line("expense", 500), account: { type: "expense", label: "資料費" } },
      ],
      groupItems: [{ groupId: BigInt(5), group: { title: "視察のまとめ" } }],
      payee: { name: "東京タクシー" },
    },
    {
      id: BigInt(2),
      entryDate: new Date("2026-08-02"),
      description: "手入力の支出",
      note: null,
      memo: null,
      documentId: null,
      lines: [{ ...line("expense", 300), account: { type: "expense", label: "消耗品費" } }],
      groupItems: [],
      payee: null,
    },
    {
      id: BigInt(3),
      entryDate: new Date("2026-08-03"),
      description: "費用明細なし",
      note: null,
      memo: null,
      documentId: null,
      lines: [{ ...line("asset", 500), account: { type: "asset", label: "預金" } }],
      groupItems: [],
      payee: null,
    },
  ]);
  expect(await repository.candidates("3")).toEqual([
    {
      id: "1",
      entryDate: "2026-08-01",
      description: "資料と交通費",
      amount: 2500,
      groupId: "5",
      groupTitle: "視察のまとめ",
      payeeName: "東京タクシー",
      accountLabel: "交通費・資料費",
      note: "視察のため",
      memo: "事務所メモ",
      documentId: "9",
    },
    {
      id: "2",
      entryDate: "2026-08-02",
      description: "手入力の支出",
      amount: 300,
      groupId: null,
      groupTitle: null,
      payeeName: null,
      accountLabel: "消耗品費",
      note: "",
      memo: "",
      documentId: null,
    },
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
