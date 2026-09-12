import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
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
// 支給は支給の登録画面で作るが、確認済の収入として一覧にも並べる（編集はさせない）。
const grantWhere = {
  source: "grant",
  lines: { some: { side: "credit", accountKey: "grant-income" } },
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
const listWhere = {
  OR: [expenseWhere, grantWhere],
} satisfies Prisma.ResearchFundJournalEntryWhereInput;
function model(row: Row): ReviewEntry | null {
  const grant = row.source === "grant";
  const amountLine = grant
    ? row.lines.find((l) => l.side === "credit" && l.accountKey === "grant-income")
    : row.lines.find((l) => l.side === "debit" && l.account.type === "expense");
  const assetLine = grant
    ? row.lines.find((l) => l.side === "debit" && l.accountKey === "bank")
    : row.lines.find(
        (l) => l.side === "credit" && l.accountKey === "bank" && l.account.type === "asset",
      );
  // このフォームが損失なく再生成できる「費用1行／普通預金1行」（支給は貸借が逆）だけを扱う。
  if (
    row.lines.length !== 2 ||
    !amountLine ||
    !assetLine ||
    !amountLine.amount.equals(assetLine.amount)
  )
    return null;
  // 書類の再スキャンで過去の仕訳に別のモデル・版を表示しない。
  const job = row.document?.scanJobs.find((j) => j.createdAt <= row.createdAt);
  return {
    id: String(row.id),
    entryDate: row.entryDate.toISOString().slice(0, 10),
    description: row.description,
    amount: amountLine.amount.toNumber(),
    accountKey: amountLine.accountKey,
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
// 同じ日付・金額・項目名・書類の仕訳は (book_id, hash) の一意制約で二重登録にならない。
async function unique<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new JournalReviewError("同じ日付・金額・項目名の仕訳がすでに登録されています");
    throw error;
  }
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
        where: { bookId: BigInt(bookId), ...listWhere },
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
    const row = await unique(() =>
      this.prisma.researchFundJournalEntry.create({
        data: {
          ...data(input),
          bookId: BigInt(bookId),
          source: "manual",
          createdById: userId,
          lines: { create: input.lines.map((l) => ({ ...l })) },
        },
      }),
    );
    return String(row.id);
  }
  async update(bookId: string, entry: ReviewEntry, input: JournalWrite) {
    await unique(() =>
      this.prisma.$transaction(async (tx) => {
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
      }),
    );
  }
  async discard(bookId: string, entry: ReviewEntry) {
    const result = await this.prisma.researchFundJournalEntry.deleteMany({
      where: guard(bookId, entry),
    });
    if (result.count !== 1)
      throw new JournalReviewError("仕訳が更新・公開されました。画面を再読み込みしてください");
  }
}
