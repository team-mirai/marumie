import { Prisma, type PrismaClient } from "@prisma/client";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { PrismaReceiptNumberRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-receipt-number.repository";

function setup(count = 1) {
  const tx = {
    researchFundDocument: {
      findMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count }),
    },
  };
  const transaction = jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx));
  const repository = new PrismaReceiptNumberRepository({
    ...tx,
    $transaction: transaction,
  } as unknown as PrismaClient);
  return { repository, tx, transaction };
}

describe("PrismaReceiptNumberRepository", () => {
  it("帳簿の書類と、同じ帳簿の公開済みの仕訳の最も早い日付を返す", async () => {
    const { repository, tx } = setup();
    tx.researchFundDocument.findMany.mockResolvedValue([
      {
        id: BigInt("9007199254740993"),
        receiptNumber: 3,
        journalEntries: [{ entryDate: new Date("2026-08-01") }],
      },
      { id: BigInt(4), receiptNumber: null, journalEntries: [] },
    ]);
    await expect(repository.listNumberingDocuments("12")).resolves.toEqual([
      { id: "9007199254740993", receiptNumber: 3, firstPublishedEntryDate: "2026-08-01" },
      { id: "4", receiptNumber: null, firstPublishedEntryDate: null },
    ]);
    expect(tx.researchFundDocument.findMany).toHaveBeenCalledWith({
      where: { bookId: BigInt(12) },
      select: {
        id: true,
        receiptNumber: true,
        journalEntries: {
          where: { bookId: BigInt(12), status: "published" },
          select: { entryDate: true },
          orderBy: { entryDate: "asc" },
          take: 1,
        },
      },
    });
  });
  it("帳簿内の未採番の書類だけを、1 つのトランザクションで更新する", async () => {
    const { repository, tx, transaction } = setup();
    await repository.assign("12", [
      { documentId: "3", receiptNumber: 1 },
      { documentId: "4", receiptNumber: 2 },
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.researchFundDocument.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: BigInt(3), bookId: BigInt(12), receiptNumber: null },
      data: { receiptNumber: 1 },
    });
    expect(tx.researchFundDocument.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: BigInt(4), bookId: BigInt(12), receiptNumber: null },
      data: { receiptNumber: 2 },
    });
  });
  it("別の帳簿の書類・採番済みの書類は更新されず、競合として投げる", async () => {
    const { repository, tx } = setup(0);
    await expect(
      repository.assign("12", [
        { documentId: "3", receiptNumber: 1 },
        { documentId: "4", receiptNumber: 2 },
      ]),
    ).rejects.toThrow(JournalReviewError);
    expect(tx.researchFundDocument.updateMany).toHaveBeenCalledTimes(1);
  });
  it("同時の採番と番号がぶつかった一意制約違反は競合のエラーにする", async () => {
    const { repository, tx } = setup();
    tx.researchFundDocument.updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(repository.assign("12", [{ documentId: "3", receiptNumber: 1 }])).rejects.toThrow(
      "再読み込み",
    );
  });
  it("それ以外のエラーはそのまま投げる", async () => {
    const { repository, tx } = setup();
    tx.researchFundDocument.updateMany.mockRejectedValue(new Error("connection lost"));
    await expect(repository.assign("12", [{ documentId: "3", receiptNumber: 1 }])).rejects.toThrow(
      "connection lost",
    );
  });
});
