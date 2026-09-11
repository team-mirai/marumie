import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  PublicationError,
  type PublicationSnapshot,
  type PublishCandidate,
} from "@/server/contexts/research-fund/domain/models/publication";
import type { PublicationRepository } from "@/server/contexts/research-fund/domain/repositories/publication-repository.interface";
import type { ResearchFundRow } from "@/shared/research-fund/aggregation";

const include = {
  lines: { include: { account: true } },
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;

/** 集計に使うのは「借方の費用」と「貸方の調査研究費収入」だけ。相手勘定の普通預金は数えない。 */
function rowsOf(entry: Row): ResearchFundRow[] {
  const date = entry.entryDate.toISOString().slice(0, 10);
  return entry.lines
    .filter(
      (line) =>
        (line.side === "debit" && line.account.type === "expense") ||
        (line.side === "credit" && line.accountKey === "grant-income"),
    )
    .map((line) => ({
      date,
      accountKey: line.accountKey,
      amount: line.amount.toNumber(),
      type: line.side === "debit" ? ("expense" as const) : ("grant" as const),
    }));
}

export class PrismaPublicationRepository implements PublicationRepository {
  constructor(private prisma: PrismaClient) {}

  async snapshot(bookId: string): Promise<PublicationSnapshot | null> {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      include: {
        journalEntries: {
          where: { status: { in: ["approved", "published"] } },
          include,
          orderBy: [{ entryDate: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!book) return null;
    const published: ResearchFundRow[] = [];
    const candidates: PublishCandidate[] = [];
    const accounts: PublicationSnapshot["accounts"] = {};
    for (const entry of book.journalEntries) {
      const rows = rowsOf(entry);
      for (const line of entry.lines)
        accounts[line.accountKey] = {
          label: line.account.label,
          legalLabel: line.account.legalLabel ?? "",
        };
      if (entry.status === "published") {
        published.push(...rows);
        continue;
      }
      // 「費用1行／収入1行」に射影できる仕訳だけを公開の候補にする（それ以外はこの画面で扱えない）。
      if (rows.length !== 1) continue;
      candidates.push({ ...rows[0], id: String(entry.id), description: entry.description });
    }
    return {
      published,
      candidates,
      accounts,
      publishedThrough: book.publishedThrough?.toISOString().slice(0, 10) ?? null,
    };
  }

  async pending(bookId: string, ids: readonly string[]) {
    const book = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { publishedThrough: true },
    });
    if (!book) return null;
    const entries = await this.prisma.researchFundJournalEntry.findMany({
      where: { bookId: BigInt(bookId), id: { in: ids.map((id) => BigInt(id)) } },
      select: { id: true, status: true, entryDate: true },
    });
    return {
      entries: entries.map((entry) => ({
        id: String(entry.id),
        status: entry.status,
        entryDate: entry.entryDate.toISOString().slice(0, 10),
      })),
      publishedThrough: book.publishedThrough?.toISOString().slice(0, 10) ?? null,
    };
  }

  async publish(bookId: string, ids: readonly string[], publishedThrough: string | null) {
    await this.prisma.$transaction(async (tx) => {
      // status: "approved" の条件が「下書きは公開できない」をDBレベルで担保する。
      const result = await tx.researchFundJournalEntry.updateMany({
        where: {
          bookId: BigInt(bookId),
          id: { in: ids.map((id) => BigInt(id)) },
          status: "approved",
        },
        data: { status: "published", publishedAt: new Date() },
      });
      if (result.count !== ids.length)
        throw new PublicationError("仕訳の状態が変わりました。画面を再読み込みしてください");
      if (publishedThrough)
        await tx.researchFundBook.update({
          where: { id: BigInt(bookId) },
          data: { publishedThrough: new Date(publishedThrough) },
        });
    });
  }
}
