import "server-only";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type {
  BookWithActivity,
  IBookRepository,
} from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import {
  legalCategoryOverrideSelect,
  loadLegalCategoryCatalog,
  overrideOf,
  withOverride,
} from "@/server/contexts/research-fund/infrastructure/repositories/legal-category-catalog";

export class PrismaBookRepository implements IBookRepository {
  constructor(private prisma: PrismaClient) {}
  async list(politicianId: string): Promise<BookWithActivity[]> {
    const books = await this.prisma.researchFundBook.findMany({
      where: { politicianId: BigInt(politicianId) },
      orderBy: { financialYear: "desc" },
      include: {
        journalEntries: {
          include: {
            lines: { include: { account: true } },
            legalCategoryOverride: legalCategoryOverrideSelect,
          },
        },
      },
    });
    const catalog = await loadLegalCategoryCatalog(
      this.prisma,
      books.flatMap((book) => book.journalEntries),
    );
    return books.map((book) => {
      const rows: BookWithActivity["rows"] = [];
      const accounts: BookWithActivity["accounts"] = {};
      for (const entry of book.journalEntries) {
        // 累計は未公開分も含む確認済み仕訳。下書きは確認待ち件数にのみ含める。
        if (entry.status === "draft") continue;
        const override = overrideOf(entry, catalog);
        for (const line of entry.lines) {
          const expense = line.side === "debit" && line.account.type === "expense";
          const grant = line.side === "credit" && line.accountKey === "grant-income";
          if (!expense && !grant) continue;
          accounts[line.accountKey] = {
            label: line.account.label,
            legalLabel: line.account.legalLabel ?? "",
          };
          rows.push({
            date: entry.entryDate.toISOString().slice(0, 10),
            accountKey: line.accountKey,
            amount: line.amount.toNumber(),
            type: expense ? "expense" : "grant",
            ...(expense ? withOverride(override) : {}),
          });
        }
      }
      return {
        book: {
          id: String(book.id),
          financialYear: book.financialYear,
          status: book.status,
          publishedThrough: book.publishedThrough?.toISOString().slice(0, 10) ?? null,
          asOfDate: book.asOfDate?.toISOString().slice(0, 10) ?? "",
          nextUpdateNote: book.nextUpdateNote ?? "",
          policyComment: book.policyComment ?? "",
        },
        draftCount: book.journalEntries.filter((entry) => entry.status === "draft").length,
        legalCategoryOverride: {
          allowed: book.allowLegalCategoryOverride,
          count: book.journalEntries.filter((entry) => entry.legalCategoryOverride).length,
        },
        rows,
        accounts,
      };
    });
  }
  async create(politicianId: string, year: number) {
    try {
      await this.prisma.researchFundBook.create({
        data: { politicianId: BigInt(politicianId), financialYear: year },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new BookError("DUPLICATE_BOOK", "この議員の年度帳簿は既に存在します");
      throw new Error("帳簿の作成に失敗しました。議員を確認して再度お試しください");
    }
  }
  async setLegalCategoryOverrideAllowed(politicianId: string, bookId: string, allowed: boolean) {
    // 取り消しは、上書き中の仕訳が残っていないことを条件に含める。条件の副問い合わせは実行中の上書き（コミット前）を
    // 見ないので、先に帳簿の行に排他ロックを取る。上書き（PrismaJournalReviewRepository）は同じ行に共有ロックを取るので、
    // 実行中の上書きのコミットを待ってから、新しい文で上書きの有無を確かめられる。
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM research_fund_books WHERE id = ${BigInt(bookId)} FOR UPDATE`;
      return tx.researchFundBook.updateMany({
        where: {
          id: BigInt(bookId),
          politicianId: BigInt(politicianId),
          ...(allowed
            ? {}
            : { journalEntries: { none: { legalCategoryOverride: { isNot: null } } } }),
        },
        data: { allowLegalCategoryOverride: allowed },
      });
    });
    if (result.count !== 1)
      throw new BookError(
        "RF_INVALID_LEGAL_CATEGORY_OVERRIDE",
        "帳簿の状態が変わりました。画面を再読み込みしてください",
      );
  }
  async legalCategoryOverrideCount(politicianId: string, bookId: string) {
    const book = await this.prisma.researchFundBook.findFirst({
      where: { id: BigInt(bookId), politicianId: BigInt(politicianId) },
      select: { id: true },
    });
    if (!book) return null;
    return this.prisma.researchFundLegalCategoryOverride.count({
      where: { entry: { bookId: BigInt(bookId) } },
    });
  }
  async update(politicianId: string, bookId: string, input: BookMetadata) {
    try {
      await this.prisma.researchFundBook.update({
        where: { id: BigInt(bookId), politicianId: BigInt(politicianId) },
        data: {
          asOfDate: input.asOfDate ? new Date(input.asOfDate) : null,
          nextUpdateNote: input.nextUpdateNote || null,
          policyComment: input.policyComment || null,
        },
      });
    } catch {
      throw new Error("帳簿の保存に失敗しました。帳簿を確認して再度お試しください");
    }
  }
}
