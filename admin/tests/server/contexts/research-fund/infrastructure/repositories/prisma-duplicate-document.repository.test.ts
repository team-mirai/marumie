import type { PrismaClient } from "@prisma/client";
import { PrismaDuplicateDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-duplicate-document.repository";

describe("PrismaDuplicateDocumentRepository", () => {
  const delegate = { findMany: jest.fn() };
  const repository = new PrismaDuplicateDocumentRepository({
    researchFundDocument: delegate,
  } as unknown as PrismaClient);
  beforeEach(() => jest.resetAllMocks());

  it("仕訳が残っている帳簿の書類だけを、最新の成功した読み取りと紐づく支払先つきで引く", async () => {
    delegate.findMany.mockResolvedValue([]);
    await repository.listScannedDocuments("12");
    expect(delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookId: BigInt(12), journalEntries: { some: {} } },
        select: expect.objectContaining({
          scanJobs: {
            where: { status: "succeeded" },
            orderBy: { id: "desc" },
            take: 1,
            select: { rawJson: true },
          },
          journalEntries: {
            where: { payeeId: { not: null } },
            distinct: ["payeeId"],
            select: { payeeId: true },
          },
        }),
      }),
    );
  });

  it("ID を文字列にし、読み取りが無い書類の原文は null にする", async () => {
    const rawJson = { date: "2026-09-01", items: [] };
    delegate.findMany.mockResolvedValue([
      {
        id: BigInt("9007199254740993"),
        originalFilename: "a.jpg",
        scanJobs: [{ rawJson }],
        journalEntries: [{ payeeId: BigInt(7) }],
      },
      { id: BigInt(4), originalFilename: "b.jpg", scanJobs: [], journalEntries: [] },
    ]);
    await expect(repository.listScannedDocuments("12")).resolves.toEqual([
      { documentId: "9007199254740993", originalFilename: "a.jpg", rawJson, payeeIds: ["7"] },
      { documentId: "4", originalFilename: "b.jpg", rawJson: null, payeeIds: [] },
    ]);
  });
});
