import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { SubmissionLedgerEntry } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";

const include = {
  lines: { include: { account: true } },
  payee: true,
  document: { select: { receiptNumber: true, mime: true } },
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;

function model(row: Row): SubmissionLedgerEntry | null {
  const expenseLine = row.lines.find((l) => l.side === "debit" && l.account.type === "expense");
  if (!expenseLine || row.source === "grant") return null;
  return {
    id: String(row.id),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    source: row.source,
    legalLabel: expenseLine.account.legalLabel,
    description: row.description,
    amount: expenseLine.amount.toNumber(),
    payeeName: row.payee?.name ?? null,
    payeeAddress: row.payee?.address ?? null,
    note: row.note,
    documentId: row.documentId === null ? null : String(row.documentId),
    receiptNumber: row.document?.receiptNumber ?? null,
    documentMime: row.document?.mime ?? null,
    receiptAbsenceReason: row.receiptAbsenceReason,
  };
}

export class PrismaSubmissionLedgerRepository implements SubmissionLedgerRepository {
  constructor(private prisma: PrismaClient) {}
  async find(bookId: string) {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { financialYear: true, politician: { select: { slug: true } } },
    });
    if (!book) return null;
    const rows = await this.prisma.researchFundJournalEntry.findMany({
      where: {
        bookId: BigInt(bookId),
        status: "published",
        source: { in: ["manual", "scan"] },
        lines: { some: { side: "debit", account: { type: "expense" } } },
      },
      include,
      orderBy: [{ entryDate: "asc" }, { id: "asc" }],
    });
    return {
      politicianSlug: book.politician.slug,
      financialYear: book.financialYear,
      entries: rows.flatMap((row) => model(row) ?? []),
    };
  }
}
