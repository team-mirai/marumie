import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { ReceiptNumberAssignment } from "@/server/contexts/research-fund/domain/models/receipt-number";
import type { ReceiptNumberRepository } from "@/server/contexts/research-fund/domain/repositories/receipt-number-repository.interface";

const CONFLICT_MESSAGE =
  "別の操作で領収書等番号が変わりました。画面を再読み込みしてから、もう一度振ってください";

export class PrismaReceiptNumberRepository implements ReceiptNumberRepository {
  constructor(private prisma: PrismaClient) {}
  async listNumberingDocuments(bookId: string) {
    const rows = await this.prisma.researchFundDocument.findMany({
      where: { bookId: BigInt(bookId) },
      select: {
        id: true,
        receiptNumber: true,
        journalEntries: {
          where: { bookId: BigInt(bookId), status: "published" },
          select: { entryDate: true },
          orderBy: { entryDate: "asc" },
          take: 1,
        },
      },
    });
    return rows.map((row) => ({
      id: String(row.id),
      receiptNumber: row.receiptNumber,
      firstPublishedEntryDate: row.journalEntries[0]?.entryDate.toISOString().slice(0, 10) ?? null,
    }));
  }
  // 採番済みの番号は変えないので、未採番（receipt_number IS NULL）であることを条件に更新する。
  // 同時に採番した操作と番号がぶつかれば (book_id, receipt_number) の一意制約で失敗し、全件を巻き戻す。
  async assign(bookId: string, assignments: readonly ReceiptNumberAssignment[]) {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const assignment of assignments) {
          const result = await tx.researchFundDocument.updateMany({
            where: {
              id: BigInt(assignment.documentId),
              bookId: BigInt(bookId),
              receiptNumber: null,
            },
            data: { receiptNumber: assignment.receiptNumber },
          });
          if (result.count !== 1) throw new JournalReviewError(CONFLICT_MESSAGE);
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new JournalReviewError(CONFLICT_MESSAGE);
      throw error;
    }
  }
}
