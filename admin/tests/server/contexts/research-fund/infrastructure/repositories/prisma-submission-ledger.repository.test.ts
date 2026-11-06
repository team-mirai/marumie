import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaSubmissionLedgerRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-submission-ledger.repository";

const lines = [
  { side: "debit", accountKey: "taxi", amount: new Prisma.Decimal(1200), account: { type: "expense", legalLabel: "⑨ 滞在費" } },
  { side: "credit", accountKey: "bank", amount: new Prisma.Decimal(1200), account: { type: "asset", legalLabel: null } },
];
const row = { id: BigInt(3), entryDate: new Date("2026-04-03"), source: "scan", description: "タクシー代", note: "国会から事務所へ", memo: "非公開メモ", documentId: BigInt(5), receiptAbsent: false, receiptAbsenceReason: null, document: { receiptNumber: 12, mime: "image/jpeg" }, lines, payee: { name: "東京タクシー", address: "東京都千代田区" } };
function setup(book: unknown = { financialYear: 2026, politician: { slug: "tanaka-taro" } }) {
  const prisma = { researchFundBook: { findUnique: jest.fn().mockResolvedValue(book) }, researchFundJournalEntry: { findMany: jest.fn().mockResolvedValue([row]) } };
  return { prisma, repository: new PrismaSubmissionLedgerRepository(prisma as unknown as PrismaClient) };
}

test("帳簿の公開済みの支出の仕訳だけを日付順に取得する", async () => {
  const { prisma, repository } = setup();
  await repository.find("7");
  const args = prisma.researchFundJournalEntry.findMany.mock.calls[0][0];
  expect(args.where).toEqual({ bookId: BigInt(7), status: "published", source: { in: ["manual", "scan"] }, lines: { some: { side: "debit", account: { type: "expense" } } } });
  expect(args.orderBy).toEqual([{ entryDate: "asc" }, { id: "asc" }]);
});
test("帳簿の年度と議員の slug を取得する", async () => {
  const { prisma, repository } = setup();
  await repository.find("7");
  expect(prisma.researchFundBook.findUnique).toHaveBeenCalledWith({ where: { id: BigInt(7) }, select: { financialYear: true, politician: { select: { slug: true } } } });
});
test("費用の行から金額と法定の区分を、支払先から氏名・住所を取り、memo は返さない", async () => {
  const { repository } = setup();
  await expect(repository.find("7")).resolves.toEqual({ politicianSlug: "tanaka-taro", financialYear: 2026, entries: [{
    id: "3", entryDate: "2026-04-03", source: "scan", legalLabel: "⑨ 滞在費", description: "タクシー代", amount: 1200,
    payeeName: "東京タクシー", payeeAddress: "東京都千代田区", note: "国会から事務所へ", documentId: "5", receiptNumber: 12, documentMime: "image/jpeg", receiptAbsent: false, receiptAbsenceReason: null,
  }] });
});
test("書類のある徴難の仕訳は、書類の番号とともに徴難と事情を返す", async () => {
  const { prisma, repository } = setup();
  prisma.researchFundJournalEntry.findMany.mockResolvedValue([{ ...row, receiptAbsent: true, receiptAbsenceReason: "振込のみ" }]);
  const ledger = await repository.find("7");
  expect(ledger?.entries[0]).toMatchObject({ documentId: "5", receiptNumber: 12, receiptAbsent: true, receiptAbsenceReason: "振込のみ" });
});
test("支払先が未設定なら氏名・住所は null", async () => {
  const { prisma, repository } = setup();
  prisma.researchFundJournalEntry.findMany.mockResolvedValue([{ ...row, payee: null, documentId: null, document: null, receiptAbsent: true, receiptAbsenceReason: "自動券売機" }]);
  const ledger = await repository.find("7");
  expect(ledger?.entries[0]).toMatchObject({ payeeName: null, payeeAddress: null, documentId: null, receiptNumber: null, documentMime: null, receiptAbsenceReason: "自動券売機" });
});
test("帳簿が無ければ仕訳を引かずに null", async () => {
  const { prisma, repository } = setup(null);
  await expect(repository.find("7")).resolves.toBeNull();
  expect(prisma.researchFundJournalEntry.findMany).not.toHaveBeenCalled();
});
test("帳簿に属する書類のストレージ上のキーを書類 ID ごとに返す", async () => {
  const findMany = jest.fn().mockResolvedValue([{ id: BigInt(5), storageKey: "key-5" }]);
  const repository = new PrismaSubmissionLedgerRepository({ researchFundDocument: { findMany } } as unknown as PrismaClient);
  await expect(repository.findDocumentStorageKeys("7", ["5", "6"])).resolves.toEqual(new Map([["5", "key-5"]]));
  expect(findMany).toHaveBeenCalledWith({ where: { bookId: BigInt(7), id: { in: [BigInt(5), BigInt(6)] } }, select: { id: true, storageKey: true } });
});

describe("法定区分の上書き（#1880）", () => {
  const catalog = [
    { legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
    { legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
  ];
  function setupWithAccounts(rows: unknown[]) {
    const { prisma, repository } = setup();
    prisma.researchFundJournalEntry.findMany.mockResolvedValue(rows);
    const accounts = { findMany: jest.fn().mockResolvedValue(catalog) };
    (prisma as Record<string, unknown>).researchFundAccount = accounts;
    return { repository, accounts };
  }

  test("上書きのある仕訳は、上書き先の区分を支出項目（並び順の基準）に使う", async () => {
    const { repository } = setupWithAccounts([
      { ...row, legalCategoryOverride: { legalCategoryKey: "research", reason: "提出済みの報告書に合わせる" } },
      { ...row, id: BigInt(4), legalCategoryOverride: null },
    ]);
    const ledger = await repository.find("7");
    expect(ledger?.entries.map((e) => e.legalLabel)).toEqual(["⑦ 調査研究費", "⑨ 滞在費"]);
  });

  test("上書きが1件も無ければ科目マスタを読まず、科目の既定の区分のまま", async () => {
    const { repository, accounts } = setupWithAccounts([{ ...row, legalCategoryOverride: null }]);
    const ledger = await repository.find("7");
    expect(ledger?.entries[0].legalLabel).toBe("⑨ 滞在費");
    expect(accounts.findMany).not.toHaveBeenCalled();
  });
});
