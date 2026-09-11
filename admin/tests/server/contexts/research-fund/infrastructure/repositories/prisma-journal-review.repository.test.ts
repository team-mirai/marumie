import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import type { JournalWrite, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
const entry = { id: "9007199254740993", updatedAt: "2026-08-01T00:00:00.000Z" } as ReviewEntry;
const input: JournalWrite = { entryDate: "2026-08-01", description: "移動", amount: 1200, accountKey: "taxi", note: "公開", memo: "非公開", hash: "hash", status: "approved", lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] };
function setup(count = 1) {
  const tx = { researchFundJournalEntry: { updateMany: jest.fn().mockResolvedValue({ count }), deleteMany: jest.fn().mockResolvedValue({ count }), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn().mockResolvedValue({ id: BigInt(entry.id) }) }, researchFundJournalLine: { deleteMany: jest.fn(), createMany: jest.fn() } };
  const transaction = jest.fn(async fn => fn(tx));
  const repository = new PrismaJournalReviewRepository({ ...tx, $transaction: transaction } as unknown as PrismaClient);
  return { repository, tx, transaction };
}
test("公開状態と更新日時をDBで照合してから同一トランザクションで行を置換", async () => {
  const { repository, tx, transaction } = setup(); await repository.update("1", entry, input);
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ id: BigInt(entry.id), bookId: BigInt(1), status: { in: ["draft", "approved"] }, updatedAt: new Date(entry.updatedAt) }), data: expect.objectContaining({ status: "approved", memo: "非公開" }) });
  expect(tx.researchFundJournalLine.deleteMany).toHaveBeenCalledWith({ where: { entryId: BigInt(entry.id) } });
  expect(tx.researchFundJournalLine.createMany).toHaveBeenCalledWith({ data: input.lines.map(l => ({ ...l, entryId: BigInt(entry.id) })) });
});
test("競合した場合は複式行を変更しない。削除も拒否", async () => {
  const { repository, tx } = setup(0);
  await expect(repository.update("1", entry, input)).rejects.toThrow("更新・公開");
  expect(tx.researchFundJournalLine.deleteMany).not.toHaveBeenCalled(); expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
  await expect(repository.discard("1", entry)).rejects.toThrow("更新・公開");
});
test("手動作成の source と帳簿、作成者、行を保存する", async () => {
  const { repository, tx } = setup(); await expect(repository.create("1", input, "user")).resolves.toBe(entry.id);
  expect(tx.researchFundJournalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ bookId: BigInt(1), createdById: "user", source: "manual", lines: { create: input.lines } }) });
});
test("一覧は帳簿内の支出に限定し、BigInt/Decimal/Dateとスキャン情報を変換", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(entry.id), entryDate: new Date(input.entryDate), createdAt: new Date("2026-08-02"), updatedAt: new Date(entry.updatedAt), description: "移動", note: "公開", memo: "非公開", source: "scan", status: "draft", splitGroup: "split", documentId: BigInt(3), lines: [{ side: "debit", accountKey: "taxi", account: { type: "expense" }, amount: new Prisma.Decimal(1200) }], document: { scanJobs: [{ createdAt: new Date("2026-08-03"), model: "later", prompt: { version: 2 } }, { createdAt: new Date("2026-08-01"), model: "original", prompt: { version: 1 } }] } }]);
  const rows = await repository.list("1"); expect(rows[0]).toMatchObject({ id: entry.id, amount: 1200, documentId: "3", memo: "非公開", model: "original", promptVersion: 1 });
  expect(tx.researchFundJournalEntry.findMany.mock.calls[0][0].where).toMatchObject({ bookId: BigInt(1), lines: { some: { side: "debit", account: { type: "expense" } } } });
});
