import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { SubmissionLedgerEntry } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import type { SubmissionLedgerRepository } from "@/server/contexts/research-fund/domain/repositories/submission-ledger-repository.interface";
import {
  legalCategoryOverrideSelect,
  loadLegalCategoryCatalog,
  overrideOf,
} from "@/server/contexts/research-fund/infrastructure/repositories/legal-category-catalog";
import {
  type LegalCategoryCatalog,
  resolveLegalLabel,
} from "@/shared/research-fund/legal-category";

const include = {
  lines: { include: { account: true } },
  payee: true,
  document: { select: { receiptNumber: true, mime: true } },
  legalCategoryOverride: legalCategoryOverrideSelect,
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;

function model(row: Row, catalog: LegalCategoryCatalog): SubmissionLedgerEntry | null {
  const expenseLine = row.lines.find((l) => l.side === "debit" && l.account.type === "expense");
  if (!expenseLine || row.source === "grant") return null;
  return {
    id: String(row.id),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    source: row.source,
    // 支出項目と並び順は、上書きがあればそれ、無ければ科目の既定の法定区分で決める（#1880）
    legalLabel: resolveLegalLabel(expenseLine.account.legalLabel, overrideOf(row, catalog)),
    description: row.description,
    amount: expenseLine.amount.toNumber(),
    payeeName: row.payee?.name ?? null,
    payeeAddress: row.payee?.address ?? null,
    note: row.note,
    documentId: row.documentId === null ? null : String(row.documentId),
    receiptNumber: row.document?.receiptNumber ?? null,
    documentMime: row.document?.mime ?? null,
    receiptAbsent: row.receiptAbsent,
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
    const catalog = await loadLegalCategoryCatalog(this.prisma, rows);
    return {
      politicianSlug: book.politician.slug,
      financialYear: book.financialYear,
      entries: rows.flatMap((row) => model(row, catalog) ?? []),
    };
  }

  async findDocumentStorageKeys(bookId: string, documentIds: readonly string[]) {
    const rows = await this.prisma.researchFundDocument.findMany({
      where: { bookId: BigInt(bookId), id: { in: documentIds.map((id) => BigInt(id)) } },
      select: { id: true, storageKey: true },
    });
    return new Map(rows.map((row) => [String(row.id), row.storageKey]));
  }
}
