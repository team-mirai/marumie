import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";
import type {
  BookWithActivity,
  IBookRepository,
} from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";

export class PrismaBookRepository implements IBookRepository {
  constructor(private prisma: PrismaClient) {}
  async list(politicianId: string): Promise<BookWithActivity[]> {
    const books = await this.prisma.researchFundBook.findMany({
      where: { politicianId: BigInt(politicianId) },
      orderBy: { financialYear: "desc" },
      include: { journalEntries: { include: { lines: { include: { account: true } } } } },
    });
    return books.map((book) => {
      const rows: BookWithActivity["rows"] = [];
      const accounts: BookWithActivity["accounts"] = {};
      for (const entry of book.journalEntries) {
        // 累計は未公開分も含む確認済み仕訳。下書きは確認待ち件数にのみ含める。
        if (entry.status === "draft") continue;
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
        throw new Error("この議員の年度帳簿は既に存在します");
      throw new Error("帳簿の作成に失敗しました。議員を確認して再度お試しください");
    }
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
