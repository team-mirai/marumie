import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import type { JournalWrite, ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
const entry = { id: "9007199254740993", updatedAt: "2026-08-01T00:00:00.000Z" } as ReviewEntry;
const input: JournalWrite = { entryDate: "2026-08-01", description: "移動", amount: 1200, accountKey: "taxi", note: "公開", memo: "非公開", hash: "hash", status: "approved", lines: [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 1200 }] };
function rowWithLines(lines = input.lines) {
  return {
    id: BigInt(entry.id), entryDate: new Date(input.entryDate), createdAt: new Date(input.entryDate),
    updatedAt: new Date(entry.updatedAt), description: input.description, note: null, memo: null,
    status: "draft", source: "manual", documentId: null, splitGroup: null, document: null,
    lines: lines.map(line => ({ ...line, amount: new Prisma.Decimal(line.amount),
      account: { type: line.side === "debit" ? "expense" : "asset" } })),
  };
}
function setup(count = 1) {
  const tx = { researchFundJournalEntry: { updateMany: jest.fn().mockResolvedValue({ count }), deleteMany: jest.fn().mockResolvedValue({ count }), findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(rowWithLines()), create: jest.fn().mockResolvedValue({ id: BigInt(entry.id) }) }, researchFundJournalLine: { deleteMany: jest.fn(), createMany: jest.fn() }, researchFundAccount: { findMany: jest.fn() }, researchFundBook: { findUnique: jest.fn() } };
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
test("一覧は帳簿内の支出と支給に限定し、BigInt/Decimal/Dateとスキャン情報を変換", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(entry.id), entryDate: new Date(input.entryDate), createdAt: new Date("2026-08-02"), updatedAt: new Date(entry.updatedAt), description: "移動", note: "公開", memo: "非公開", source: "scan", status: "draft", splitGroup: "split", documentId: BigInt(3), lines: [{ side: "debit", accountKey: "taxi", account: { type: "expense" }, amount: new Prisma.Decimal(1200) }, { side: "credit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1200) }], document: { scanJobs: [{ createdAt: new Date("2026-08-03"), model: "later", prompt: { version: 2 } }, { createdAt: new Date("2026-08-01"), model: "original", prompt: { version: 1 } }] } }]);
  const rows = await repository.list("1"); expect(rows[0]).toMatchObject({ id: entry.id, amount: 1200, documentId: "3", memo: "非公開", model: "original", promptVersion: 1 });
  expect(tx.researchFundJournalEntry.findMany.mock.calls[0][0].where).toMatchObject({ bookId: BigInt(1), OR: [{ source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } }, { source: "grant", lines: { some: { side: "credit", accountKey: "grant-income" } } }] });
});

test("支給は貸方の調査研究費収入から金額を取り、確認済として一覧に並ぶ", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findMany.mockResolvedValue([{ id: BigInt(entry.id), entryDate: new Date("2026-05-01"), createdAt: new Date("2026-05-01"), updatedAt: new Date(entry.updatedAt), description: "調査研究費 5月分", note: null, memo: null, source: "grant", status: "approved", splitGroup: null, documentId: null, document: null, lines: [{ side: "debit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1000000) }, { side: "credit", accountKey: "grant-income", account: { type: "income" }, amount: new Prisma.Decimal(1000000) }] }]);
  await expect(repository.list("1")).resolves.toEqual([expect.objectContaining({ id: entry.id, entryDate: "2026-05-01", description: "調査研究費 5月分", amount: 1000000, accountKey: "grant-income", source: "grant", status: "approved", documentId: null })]);
});

test("手動仕訳を取得し、書類・メモの欠損値を表示用に変換する", async () => {
  const { repository, tx } = setup();
  tx.researchFundJournalEntry.findFirst.mockResolvedValue({
    id: BigInt(entry.id), entryDate: new Date(input.entryDate), updatedAt: new Date(entry.updatedAt),
    createdAt: new Date(input.entryDate), description: "移動", note: null, memo: null,
    status: "draft", source: "manual", documentId: null, splitGroup: null, document: null,
    lines: [{ side: "credit", accountKey: "bank", account: { type: "asset" }, amount: new Prisma.Decimal(1200) },
      { side: "debit", accountKey: "taxi", account: { type: "expense" }, amount: new Prisma.Decimal(1200) }],
  });
  await expect(repository.find("1", entry.id)).resolves.toEqual({
    id: entry.id, entryDate: input.entryDate, updatedAt: entry.updatedAt, description: "移動",
    note: "", memo: "", status: "draft", source: "manual", documentId: null, splitGroup: null,
    model: null, promptVersion: null, amount: 1200, accountKey: "taxi",
  });
  expect(tx.researchFundJournalEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: BigInt(entry.id), bookId: BigInt(1), source: { in: ["manual", "scan"] },
      lines: { some: { side: "debit", account: { type: "expense" } } } },
  }));
  tx.researchFundJournalEntry.findFirst.mockResolvedValue(null);
  await expect(repository.find("9", entry.id)).resolves.toBeNull();
});
test("科目は表示順に取得し、帳簿が存在しなければ年度を返さない", async () => {
  const { repository, tx } = setup();
  const accounts = [{ key: "taxi", label: "タクシー代", type: "expense" }];
  tx.researchFundAccount.findMany.mockResolvedValue(accounts);
  await expect(repository.accounts()).resolves.toEqual(accounts);
  expect(tx.researchFundAccount.findMany).toHaveBeenCalledWith({ orderBy: { displayOrder: "asc" } });
  tx.researchFundBook.findUnique.mockResolvedValue({ financialYear: 2026 });
  await expect(repository.year("1")).resolves.toBe(2026);
  expect(tx.researchFundBook.findUnique).toHaveBeenCalledWith({ where: { id: BigInt(1) } });
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.year("1")).resolves.toBeNull();
});
test("空の公開・非公開メモはNULLで保存し、破棄でも競合条件を適用する", async () => {
  const { repository, tx } = setup();
  await repository.create("1", { ...input, note: "", memo: "" }, "user");
  expect(tx.researchFundJournalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ note: null, memo: null }) });
  await repository.discard("1", entry);
  expect(tx.researchFundJournalEntry.deleteMany).toHaveBeenCalledWith({ where: {
    id: BigInt(entry.id), bookId: BigInt(1), updatedAt: new Date(entry.updatedAt),
    status: { in: ["draft", "approved"] }, source: { in: ["manual", "scan"] },
    lines: { some: { side: "debit", account: { type: "expense" } } },
  } });
});


test.each([
  ["複数の費用借方", [{ side: "debit", accountKey: "taxi", amount: 500 }, { side: "debit", accountKey: "books-newspapers", amount: 700 }, { side: "credit", accountKey: "bank", amount: 1200 }]],
  ["複数の貸方", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 500 }, { side: "credit", accountKey: "cash", amount: 700 }]],
  ["現金決済", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "cash", amount: 1200 }]],
  ["貸借不一致", [{ side: "debit", accountKey: "taxi", amount: 1200 }, { side: "credit", accountKey: "bank", amount: 500 }]],
  ["借方のみ", [{ side: "debit", accountKey: "taxi", amount: 1200 }]],
] as const)("%sは一覧・取得から除外し、更新時も既存行を保持する", async (_name, lines) => {
  const { repository, tx } = setup();
  const unsupported = rowWithLines([...lines]);
  tx.researchFundJournalEntry.findMany.mockResolvedValue([unsupported, rowWithLines()]);
  await expect(repository.list("1")).resolves.toHaveLength(1);
  tx.researchFundJournalEntry.findFirst.mockResolvedValue(unsupported);
  await expect(repository.find("1", entry.id)).resolves.toBeNull();
  await expect(repository.update("1", entry, input)).rejects.toThrow("この形式の仕訳は編集できません");
  expect(tx.researchFundJournalLine.deleteMany).not.toHaveBeenCalled();
  expect(tx.researchFundJournalLine.createMany).not.toHaveBeenCalled();
});
