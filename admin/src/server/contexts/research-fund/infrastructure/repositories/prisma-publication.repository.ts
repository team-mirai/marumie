import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { DocumentMaskingPolicy } from "@/server/contexts/research-fund/domain/models/document-masking";
import {
  Publication,
  PublicationError,
  type PublicationDocument,
  type PublicationSnapshot,
  type PublishCandidate,
} from "@/server/contexts/research-fund/domain/models/publication";
import type { PublicationRepository } from "@/server/contexts/research-fund/domain/repositories/publication-repository.interface";
import type { ResearchFundRow } from "@/shared/research-fund/aggregation";
import type { LegalCategoryCatalog } from "@/shared/research-fund/legal-category";
import { researchFundRowsOf } from "@/shared/research-fund/journal-line";
import {
  legalCategoryOverrideSelect,
  loadLegalCategoryCatalog,
  overrideOf,
} from "@/server/contexts/research-fund/infrastructure/repositories/legal-category-catalog";

const include = {
  lines: { include: { account: true } },
  document: { select: { maskingStatus: true, maskedKey: true } },
  legalCategoryOverride: legalCategoryOverrideSelect,
} satisfies Prisma.ResearchFundJournalEntryInclude;
type Row = Prisma.ResearchFundJournalEntryGetPayload<{ include: typeof include }>;

/** 仕訳に付いた書類の公開用の版の状態。書類が無ければ null */
function documentOf(entry: Row): PublicationDocument | null {
  if (!entry.document) return null;
  return {
    maskingStatus: entry.document.maskingStatus,
    hasMaskedVersion: entry.document.maskedKey !== null,
  };
}

/** 集計に使う行の読み取りは公開ページと同じ規則で行う（shared/research-fund/journal-line.ts） */
function rowsOf(entry: Row, catalog: LegalCategoryCatalog): ResearchFundRow[] {
  return researchFundRowsOf({
    date: entry.entryDate.toISOString().slice(0, 10),
    lines: entry.lines,
    // 法律上の区分の集計は、上書きがあればそれ、無ければ科目の既定で数える（#1880）
    legalCategoryOverride: overrideOf(entry, catalog),
  }).map(({ row }) => row);
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
    const catalog = await loadLegalCategoryCatalog(this.prisma, book.journalEntries);
    for (const entry of book.journalEntries) {
      const rows = rowsOf(entry, catalog);
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
      if (!Publication.isPublishable(rows.length)) continue;
      const document = documentOf(entry);
      candidates.push({
        ...rows[0],
        id: String(entry.id),
        description: entry.description,
        document,
        documentRejection: Publication.documentRejection(document),
      });
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
      include,
    });
    const catalog = await loadLegalCategoryCatalog(this.prisma, entries);
    return {
      entries: entries.map((entry) => ({
        id: String(entry.id),
        status: entry.status,
        entryDate: entry.entryDate.toISOString().slice(0, 10),
        description: entry.description,
        document: documentOf(entry),
        // 候補の適格性は画面と同じ射影で測る（画面に出ない仕訳を公開させない）。
        rowCount: rowsOf(entry, catalog).length,
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
          // 判定のあとで作り直しが依頼されても、公開用の版が作成済みでない書類の付いた仕訳は公開しない。
          OR: [
            { documentId: null },
            {
              document: {
                maskingStatus: DocumentMaskingPolicy.publishableStatus,
                maskedKey: { not: null },
              },
            },
          ],
        },
        data: { status: "published", publishedAt: new Date() },
      });
      if (result.count !== ids.length)
        throw new PublicationError("仕訳の状態が変わりました。画面を再読み込みしてください");
      // 並行して別の月を公開しても公開範囲が後退しないよう、既存値より新しいときだけ前進させる。
      if (publishedThrough)
        await tx.researchFundBook.updateMany({
          where: {
            id: BigInt(bookId),
            OR: [
              { publishedThrough: null },
              { publishedThrough: { lt: new Date(publishedThrough) } },
            ],
          },
          data: { publishedThrough: new Date(publishedThrough) },
        });
    });
  }
}
