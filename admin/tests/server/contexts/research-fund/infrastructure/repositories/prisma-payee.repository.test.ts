import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";

const row = { id: BigInt(7), politicianId: BigInt(5), name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123", createdAt: new Date(), updatedAt: new Date() };
const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123" };
const input = { name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123" };
function setup() {
  const tx = { researchFundJournalEntry: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0), updateMany: jest.fn().mockResolvedValue({ count: 2 }) }, researchFundPayee: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn().mockResolvedValue(row), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(row), delete: jest.fn().mockResolvedValue(row) }, researchFundPayeeAlias: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), createMany: jest.fn().mockResolvedValue({ count: 1 }) } };
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
test("表記は議員の支払先のものを記録の古い順に返し、同じ表記を持つ同じ議員の別の支払先を添える", async () => {
  const { repository, tx } = setup();
  const createdAt = new Date("2026-05-01T00:00:00.000Z");
  tx.researchFundPayeeAlias.findMany
    .mockResolvedValueOnce([
      { id: BigInt(3), name: "Amazon.co.jp", normalizedName: "amazon.co.jp", source: "ai", createdAt, document: { id: BigInt(21), originalFilename: "amazon.jpg" } },
      { id: BigInt(4), name: "アマゾン", normalizedName: "アマゾン", source: "manual", createdAt, document: null },
    ])
    .mockResolvedValueOnce([{ normalizedName: "amazon.co.jp", payee: { id: BigInt(8), name: "Amazon マーケットプレイス" } }]);
  await expect(repository.listAliases("5", "7")).resolves.toEqual([
    { id: "3", name: "Amazon.co.jp", source: "ai", document: { id: "21", originalFilename: "amazon.jpg" }, createdAt: createdAt.toISOString(), sharedWith: [{ id: "8", name: "Amazon マーケットプレイス" }] },
    { id: "4", name: "アマゾン", source: "manual", document: null, createdAt: createdAt.toISOString(), sharedWith: [] },
  ]);
  expect(tx.researchFundPayeeAlias.findMany.mock.calls[0][0].where).toEqual({ payeeId: BigInt(7), payee: { politicianId: BigInt(5) } });
  expect(tx.researchFundPayeeAlias.findMany.mock.calls[1][0].where).toEqual({ normalizedName: { in: ["amazon.co.jp", "アマゾン"] }, payeeId: { not: BigInt(7) }, payee: { politicianId: BigInt(5) } });
});
test("表記が無ければ別の支払先を探さずに空を返す", async () => {
  const { repository, tx } = setup();
  await expect(repository.listAliases("6", "7")).resolves.toEqual([]);
  expect(tx.researchFundPayeeAlias.findMany).toHaveBeenCalledTimes(1);
});
test("表記の削除は支払先と議員で絞り込み、消せなければ false を返す", async () => {
  const { repository, tx } = setup();
  await expect(repository.deleteAlias("5", "7", "3")).resolves.toBe(true);
  expect(tx.researchFundPayeeAlias.deleteMany).toHaveBeenCalledWith({ where: { id: BigInt(3), payeeId: BigInt(7), payee: { politicianId: BigInt(5) } } });
  tx.researchFundPayeeAlias.deleteMany.mockResolvedValue({ count: 0 });
  await expect(repository.deleteAlias("6", "7", "3")).resolves.toBe(false);
});
test("削除の影響は議員の支払先について、すべての帳簿の仕訳を公開中とそれ以外に分けて数える", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue(row);
  tx.researchFundJournalEntry.count.mockResolvedValueOnce(1).mockResolvedValueOnce(4);
  await expect(repository.deletionImpact("5", "7")).resolves.toEqual({ publishedCount: 1, unlinkedCount: 4 });
  expect(tx.researchFundJournalEntry.count.mock.calls.map(([args]) => args.where)).toEqual([{ payeeId: BigInt(7), status: "published" }, { payeeId: BigInt(7), status: { not: "published" } }]);
  tx.researchFundPayee.findFirst.mockResolvedValue(null);
  await expect(repository.deletionImpact("6", "7")).resolves.toBeNull();
});
test("削除は公開中でない仕訳の紐づけを経路・確信度・根拠ごと外してから支払先を消す", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue({ id: BigInt(7) });
  await expect(repository.delete("5", "7")).resolves.toEqual({ status: "deleted", unlinkedCount: 2 });
  expect(tx.researchFundPayee.findFirst.mock.calls[0][0].where).toEqual({ id: BigInt(7), politicianId: BigInt(5) });
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: { payeeId: BigInt(7), status: { not: "published" } }, data: { payeeId: null, payeeLinkSource: null, payeeLinkConfidence: null, payeeLinkReason: null } });
  expect(tx.researchFundJournalEntry.count.mock.calls[0][0].where).toEqual({ payeeId: BigInt(7), status: "published" });
  expect(tx.researchFundPayee.delete).toHaveBeenCalledWith({ where: { id: BigInt(7) } });
});
test("公開中の仕訳が残っていれば支払先を消さず、外した紐づけも巻き戻すようトランザクションを例外で抜ける", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue({ id: BigInt(7) });
  tx.researchFundJournalEntry.count.mockResolvedValue(3);
  await expect(repository.delete("5", "7")).resolves.toEqual({ status: "published", publishedCount: 3 });
  expect(tx.researchFundPayee.delete).not.toHaveBeenCalled();
});
test("別の議員の支払先は何も変えずに見つからないとする", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue(null);
  await expect(repository.delete("6", "7")).resolves.toEqual({ status: "not-found" });
  expect(tx.researchFundJournalEntry.updateMany).not.toHaveBeenCalled();
  expect(tx.researchFundPayee.delete).not.toHaveBeenCalled();
});
test("削除中に別の仕訳が紐づけられて外部キーで止まったら、やり直しを促すエラーにする", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findFirst.mockResolvedValue({ id: BigInt(7) });
  tx.researchFundPayee.delete.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "test" }));
  await expect(repository.delete("5", "7")).rejects.toThrow("もう一度お試しください");
});
test("統合の候補は議員の支払先のうち統合先以外を、すべての帳簿の仕訳の件数と記録された表記つきで返す", async () => {
  const { repository, tx } = setup();
  tx.researchFundPayee.findMany.mockResolvedValue([{ ...row, id: BigInt(8), _count: { journalEntries: 3 }, aliases: [{ name: "東京ﾀｸｼｰ", normalizedName: "東京タクシー" }] }]);
  await expect(repository.listMergeCandidates("5", "7")).resolves.toEqual([{ ...payee, id: "8", entryCount: 3, aliases: [{ name: "東京ﾀｸｼｰ", normalizedName: "東京タクシー" }] }]);
  const args = tx.researchFundPayee.findMany.mock.calls[0][0];
  expect(args.where).toEqual({ politicianId: BigInt(5), id: { not: BigInt(7) } });
  expect(args.include._count).toEqual({ select: { journalEntries: true } });
});
describe("統合", () => {
  const targetRow = { ...row, aliases: [{ id: BigInt(1), name: "東京タクシー", normalizedName: "東京タクシー", documentId: BigInt(20) }] };
  const sourceRow = { ...row, id: BigInt(8), name: "東京ﾀｸｼｰ(株)", invoiceRegistrationNumber: null, aliases: [{ id: BigInt(2), name: "東京ﾀｸｼｰ", normalizedName: "東京タクシー", documentId: BigInt(21) }, { id: BigInt(3), name: "TOKYO TAXI", normalizedName: "tokyotaxi", documentId: null }] };
  function mergeSetup() {
    const context = setup();
    context.tx.researchFundPayee.findFirst.mockImplementation(async ({ where }) => (where.id === BigInt(7) ? targetRow : where.id === BigInt(8) ? sourceRow : null));
    context.tx.researchFundJournalEntry.updateMany.mockResolvedValue({ count: 4 });
    return context;
  }
  test("統合元の仕訳を経路などはそのままに統合先へ紐づけ直し、統合先に無い表記を移し、統合元の名称を表記にして統合元を消す", async () => {
    const { repository, tx } = mergeSetup();
    await expect(repository.merge("5", "7", "8")).resolves.toEqual({ status: "merged", movedEntryCount: 4 });
    expect(tx.researchFundPayee.findFirst.mock.calls.map(([args]) => args.where)).toEqual([{ id: BigInt(7), politicianId: BigInt(5) }, { id: BigInt(8), politicianId: BigInt(5) }]);
    expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({ where: { payeeId: BigInt(8) }, data: { payeeId: BigInt(7) } });
    expect(tx.researchFundPayeeAlias.updateMany).toHaveBeenCalledWith({ where: { id: { in: [BigInt(3)] } }, data: { payeeId: BigInt(7) } });
    expect(tx.researchFundPayeeAlias.createMany).toHaveBeenCalledWith({ data: [{ payeeId: BigInt(7), name: "東京ﾀｸｼｰ(株)", normalizedName: "東京タクシー株式会社", source: "manual" }] });
    expect(tx.researchFundPayee.delete).toHaveBeenCalledWith({ where: { id: BigInt(8) } });
    // 統合先の表記にすでに最初の書類があれば上書きしない
    expect(tx.researchFundPayeeAlias.updateMany).toHaveBeenCalledTimes(1);
  });
  test("統合先にすでにある表記に最初の書類が無ければ、消える統合元の表記の書類を引き継ぐ", async () => {
    const { repository, tx } = mergeSetup();
    tx.researchFundPayee.findFirst.mockImplementation(async ({ where }) => (where.id === BigInt(7) ? { ...targetRow, aliases: [{ ...targetRow.aliases[0], documentId: null }] } : sourceRow));
    await expect(repository.merge("5", "7", "8")).resolves.toEqual({ status: "merged", movedEntryCount: 4 });
    expect(tx.researchFundPayeeAlias.updateMany).toHaveBeenCalledWith({ where: { id: BigInt(1), documentId: null }, data: { documentId: BigInt(21) } });
  });
  test("移す表記・記録する名称が無ければ表記を変えない", async () => {
    const { repository, tx } = mergeSetup();
    tx.researchFundPayee.findFirst.mockImplementation(async ({ where }) => (where.id === BigInt(7) ? targetRow : { ...sourceRow, name: "東京タクシー", aliases: [] }));
    await expect(repository.merge("5", "7", "8")).resolves.toEqual({ status: "merged", movedEntryCount: 4 });
    expect(tx.researchFundPayeeAlias.updateMany).not.toHaveBeenCalled();
    expect(tx.researchFundPayeeAlias.createMany).not.toHaveBeenCalled();
  });
  test("インボイス登録番号が食い違えば何も変えずに理由を返す", async () => {
    const { repository, tx } = mergeSetup();
    tx.researchFundPayee.findFirst.mockImplementation(async ({ where }) => (where.id === BigInt(7) ? targetRow : { ...sourceRow, invoiceRegistrationNumber: "T9999999999999" }));
    await expect(repository.merge("5", "7", "8")).resolves.toMatchObject({ status: "rejected", reason: expect.stringContaining("インボイス登録番号が食い違うため統合できません") });
    expect(tx.researchFundJournalEntry.updateMany).not.toHaveBeenCalled();
    expect(tx.researchFundPayee.delete).not.toHaveBeenCalled();
  });
  test("どちらかが別の議員の支払先なら何も変えずに見つからないとする", async () => {
    const { repository, tx } = mergeSetup();
    await expect(repository.merge("5", "7", "9")).resolves.toEqual({ status: "not-found" });
    expect(tx.researchFundJournalEntry.updateMany).not.toHaveBeenCalled();
    expect(tx.researchFundPayee.delete).not.toHaveBeenCalled();
  });
  test("統合中に紐づけ・表記が変わって外部キー・一意制約で止まったら、やり直しを促すエラーにする", async () => {
    const { repository, tx } = mergeSetup();
    tx.researchFundPayee.delete.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "test" }));
    await expect(repository.merge("5", "7", "8")).rejects.toThrow("もう一度お試しください");
    tx.researchFundPayee.delete.mockRejectedValue(duplicate);
    await expect(repository.merge("5", "7", "8")).rejects.toThrow("もう一度お試しください");
  });
});
