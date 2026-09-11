import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  JournalReviewError,
  type JournalWrite,
  type ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

const include = {
  lines: { include: { account: true } },
  document: {
    include: {
      scanJobs: {
        where: { status: "succeeded" as const },
        orderBy: { createdAt: "desc" as const },
        include: { prompt: true },
      },
    },
  },
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;
const expenseWhere = {
  source: { in: ["manual", "scan"] },
  lines: { some: { side: "debit", account: { type: "expense" } } },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
function model(row: Row): ReviewEntry | null {
  const expense = row.lines.find((l) => l.side === "debit" && l.account.type === "expense");
  const bank = row.lines.find(
    (l) => l.side === "credit" && l.accountKey === "bank" && l.account.type === "asset",
  );
  // このフォームが損失なく再生成できる「費用1行／普通預金1行」だけを扱う。
  if (row.lines.length !== 2 || !expense || !bank || !expense.amount.equals(bank.amount))
    return null;
  // 書類の再スキャンで過去の仕訳に別のモデル・版を表示しない。
  const job = row.document?.scanJobs.find((j) => j.createdAt <= row.createdAt);
  return {
    id: String(row.id),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    description: row.description,
    amount: expense.amount.toNumber(),
    accountKey: expense.accountKey,
    note: row.note ?? "",
    memo: row.memo ?? "",
    status: row.status,
    source: row.source,
    documentId: row.documentId === null ? null : String(row.documentId),
    splitGroup: row.splitGroup,
    updatedAt: row.updatedAt.toISOString(),
    model: job?.model ?? null,
    promptVersion: job?.prompt.version ?? null,
  };
}
function data(input: JournalWrite) {
  return {
    entryDate: new Date(input.entryDate),
    description: input.description,
    note: input.note || null,
    memo: input.memo || null,
    status: input.status,
    hash: input.hash,
  };
}
function guard(bookId: string, entry: ReviewEntry) {
  return {
    id: BigInt(entry.id),
    bookId: BigInt(bookId),
    status: { in: ["draft", "approved"] as ("draft" | "approved")[] },
    updatedAt: new Date(entry.updatedAt),
    ...expenseWhere,
  };
}
export class PrismaJournalReviewRepository implements JournalReviewRepository {
  constructor(private prisma: PrismaClient) {}
  async list(bookId: string) {
    return (
      await this.prisma.researchFundJournalEntry.findMany({
        where: { bookId: BigInt(bookId), ...expenseWhere },
        include,
        orderBy: [{ entryDate: "desc" }, { id: "asc" }],
      })
    )
      .map(model)
      .filter((entry): entry is ReviewEntry => entry !== null);
  }
  async accounts() {
    return this.prisma.researchFundAccount.findMany({ orderBy: { displayOrder: "asc" } });
  }
  async find(bookId: string, id: string) {
    const row = await this.prisma.researchFundJournalEntry.findFirst({
      where: { bookId: BigInt(bookId), id: BigInt(id), ...expenseWhere },
      include,
    });
    return row ? model(row) : null;
  }
  async year(bookId: string) {
    return (
      (await this.prisma.researchFundBook.findUnique({ where: { id: BigInt(bookId) } }))
        ?.financialYear ?? null
    );
  }
  async create(bookId: string, input: JournalWrite, userId: string) {
    const row = await this.prisma.researchFundJournalEntry.create({
      data: {
        ...data(input),
        bookId: BigInt(bookId),
        source: "manual",
        createdById: userId,
        lines: { create: input.lines.map((l) => ({ ...l })) },
      },
    });
    return String(row.id);
  }
  async update(bookId: string, entry: ReviewEntry, input: JournalWrite) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.researchFundJournalEntry.updateMany({
        where: guard(bookId, entry),
        data: data(input),
      });
      if (result.count !== 1)
        throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
      const row = await tx.researchFundJournalEntry.findFirst({
        where: { id: BigInt(entry.id), bookId: BigInt(bookId) },
        include,
      });
      if (!row || !model(row)) throw new JournalReviewError("この形式の仕訳は編集できません");
      await tx.researchFundJournalLine.deleteMany({ where: { entryId: BigInt(entry.id) } });
      await tx.researchFundJournalLine.createMany({
        data: input.lines.map((l) => ({ ...l, entryId: BigInt(entry.id) })),
      });
    });
  }
  async discard(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.deleteMany({
      where: guard(bookId, entry),
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
  }
}
