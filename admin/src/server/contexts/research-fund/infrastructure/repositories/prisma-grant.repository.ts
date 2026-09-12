import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  GrantRegistrationError,
  type GrantWrite,
} from "@/server/contexts/research-fund/domain/models/grant-registration";
import type { GrantRepository } from "@/server/contexts/research-fund/domain/repositories/grant-repository.interface";

function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { gte: start, lt: end };
}

export class PrismaGrantRepository implements GrantRepository {
  constructor(private prisma: PrismaClient) {}

  async book(bookId: string) {
    const row = await this.prisma.researchFundBook.findUnique({
      where: { id: BigInt(bookId) },
      select: { financialYear: true, politician: { select: { termStart: true } } },
    });
    return row
      ? {
          financialYear: row.financialYear,
          termStart: row.politician.termStart.toISOString().slice(0, 10),
        }
      : null;
  }

  async registeredMonths(bookId: string) {
    const rows = await this.prisma.researchFundJournalEntry.findMany({
      where: { bookId: BigInt(bookId), source: "grant" },
      select: { entryDate: true },
    });
    return rows.map((row) => row.entryDate.toISOString().slice(0, 7));
  }

  async accounts() {
    return this.prisma.researchFundAccount.findMany({ orderBy: { displayOrder: "asc" } });
  }

  async create(bookId: string, month: string, input: GrantWrite, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 同月の二重生成を拒否する。月初から翌月初の半開区間で判定する。
        const duplicates = await tx.researchFundJournalEntry.count({
          where: { bookId: BigInt(bookId), source: "grant", entryDate: monthRange(month) },
        });
        if (duplicates > 0)
          throw new GrantRegistrationError("この月の支給はすでに登録されています");
        const row = await tx.researchFundJournalEntry.create({
          data: {
            bookId: BigInt(bookId),
            entryDate: new Date(`${input.entryDate}T00:00:00.000Z`),
            description: input.description,
            // 振込は機械的なため下書きを経ずに確認済で作る。
            status: "approved",
            source: "grant",
            hash: input.hash,
            createdById: userId,
            lines: { create: input.lines.map((line) => ({ ...line })) },
          },
        });
        return String(row.id);
      });
    } catch (error) {
      // 同月の判定をすり抜けて同時に登録された（(book_id, hash) の一意制約）
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new GrantRegistrationError("この月の支給はすでに登録されています");
      throw error;
    }
  }
}
