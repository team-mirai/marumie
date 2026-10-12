import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { ScannedDocument } from "@/server/contexts/research-fund/domain/models/duplicate-document";
import type { DuplicateDocumentRepository } from "@/server/contexts/research-fund/domain/repositories/duplicate-document-repository.interface";

export class PrismaDuplicateDocumentRepository implements DuplicateDocumentRepository {
  constructor(private prisma: PrismaClient) {}

  async listScannedDocuments(bookId: string): Promise<ScannedDocument[]> {
    const rows = await this.prisma.researchFundDocument.findMany({
      // 仕訳をすべて取り消した書類は書類だけが残るので、仕訳の有無で絞る
      where: { bookId: BigInt(bookId), journalEntries: { some: {} } },
      select: {
        id: true,
        originalFilename: true,
        // 読み直しで下書きは最新の読み取りに置き換わるので、最新の成功した読み取りで比べる
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
      },
      orderBy: { id: "asc" },
    });
    return rows.map((row) => ({
      documentId: row.id.toString(),
      originalFilename: row.originalFilename,
      rawJson: row.scanJobs[0]?.rawJson ?? null,
      payeeIds: row.journalEntries.flatMap((entry) =>
        entry.payeeId === null ? [] : [entry.payeeId.toString()],
      ),
    }));
  }
}
