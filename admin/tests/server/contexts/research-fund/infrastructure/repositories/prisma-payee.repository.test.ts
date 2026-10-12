import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";

const row = { id: BigInt(7), politicianId: BigInt(5), name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123", createdAt: new Date(), updatedAt: new Date() };
const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123" };
const input = { name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123" };
function setup() {
  const tx = { researchFundJournalEntry: { findMany: jest.fn() }, researchFundPayee: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(row) } };
  const repository = new PrismaPayeeRepository({ ...tx, $transaction: jest.fn(async fn => fn(tx)) } as unknown as PrismaClient);
  return { repository, tx };
}
const duplicate = new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });

test("一覧は議員の支払先だけを、帳簿で紐づいている仕訳の件数つきで返す", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findMany.mockResolvedValue([{ ...row, _count: { journalEntries: 3 } }]);
  await expect(repository.list("5", "1")).resolves.toEqual([{ ...payee, usageCount: 3 }]);
  const args = tx.researchFundPayee.findMany.mock.calls[0][0];
  expect(args.where).toEqual({ politicianId: BigInt(5) });
  expect(args.include._count.select.journalEntries).toEqual({ where: { bookId: BigInt(1) } });
});
test("紐づいた仕訳は帳簿と議員の支払先で絞り込み、借方の合計を金額として日付の新しい順に返す", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(11), entryDate: new Date("2026-05-01"), description: "タクシー代", status: "approved", lines: [{ amount: new Prisma.Decimal(1200) }] }]);
  await expect(repository.listJournalEntries("5", "7", "1")).resolves.toEqual([{ id: "11", entryDate: "2026-05-01", description: "タクシー代", amount: 1200, status: "approved" }]);
  const args = tx.researchFundJournalEntry.findMany.mock.calls[0][0];
  expect(args.where).toEqual({ bookId: BigInt(1), payeeId: BigInt(7), payee: { politicianId: BigInt(5) } });
  expect(args.include.lines.where).toEqual({ side: "debit" });
  expect(args.orderBy).toEqual([{ entryDate: "desc" }, { id: "asc" }]);
});
test("1件の取得は議員で絞り込み、別の議員の支払先は返さない", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue(row);
  await expect(repository.find("5", "7")).resolves.toEqual(payee);
  expect(tx.researchFundPayee.findFirst).toHaveBeenCalledWith({ where: { id: BigInt(7), politicianId: BigInt(5) } });
  tx.researchFundPayee.findFirst.mockResolvedValue(null);
  await expect(repository.find("6", "7")).resolves.toBeNull();
});
test("作成は議員の支払先として保存する", async () => {
  const { repository, tx } = setup();
  await expect(repository.create("5", input)).resolves.toEqual(payee);
  expect(tx.researchFundPayee.create).toHaveBeenCalledWith({ data: { ...input, politicianId: BigInt(5) } });
});
test("編集は議員で絞り込み、別の議員の支払先なら変更せずに拒否する", async () => {
  const { repository, tx } = setup();
  await expect(repository.update("5", "7", input)).resolves.toEqual(payee);
  expect(tx.researchFundPayee.updateMany).toHaveBeenCalledWith({ where: { id: BigInt(7), politicianId: BigInt(5) }, data: input });
  tx.researchFundPayee.updateMany.mockResolvedValue({ count: 0 });
  await expect(repository.update("6", "7", input)).rejects.toThrow("支払先が見つかりません");
});
test("同じ名称・住所の支払先は作成・編集とも登録済みのエラーにする", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.create.mockRejectedValue(duplicate);
  await expect(repository.create("5", input)).rejects.toThrow("すでに登録されています");
  tx.researchFundPayee.updateMany.mockRejectedValue(duplicate);
  await expect(repository.update("5", "7", input)).rejects.toThrow("すでに登録されています");
});
test("一意制約以外のエラーはそのまま投げる", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.create.mockRejectedValue(new Error("connection lost"));
  await expect(repository.create("5", input)).rejects.toThrow("connection lost");
});
