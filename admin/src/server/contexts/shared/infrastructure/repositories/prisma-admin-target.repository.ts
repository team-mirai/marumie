import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
import type { IAdminTargetRepository } from "@/server/contexts/shared/domain/repositories/admin-target-repository.interface";

export class PrismaAdminTargetRepository implements IAdminTargetRepository {
  constructor(private prisma: PrismaClient) {}

  async list(currentYear: number): Promise<AdminTarget[]> {
    const [organizations, books] = await Promise.all([
      this.prisma.politicalOrganization.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          displayName: true,
          transactions: { distinct: ["financialYear"], select: { financialYear: true } },
          reportProfiles: { select: { financialYear: true } },
        },
      }),
      this.prisma.researchFundBook.findMany({
        orderBy: [{ politicianId: "asc" }, { financialYear: "desc" }],
        select: {
          id: true,
          politicianId: true,
          financialYear: true,
          politician: { select: { name: true } },
          _count: { select: { journalEntries: { where: { status: "draft" } } } },
        },
      }),
    ]);
    return [
      ...organizations.flatMap((org): AdminTarget[] => {
        // データのない団体でも当年・前年を選べ、既存データの年度も失わない。
        const years = new Set([
          currentYear,
          currentYear - 1,
          ...org.transactions.map((t) => t.financialYear),
          ...org.reportProfiles.map((p) => p.financialYear),
        ]);
        return [...years]
          .sort((a, b) => b - a)
          .map((year) => ({
            kind: "political-organization",
            key: `org:${org.id}:${year}`,
            organizationId: String(org.id),
            name: org.displayName,
            year,
          }));
      }),
      ...books.map(
        (book): AdminTarget => ({
          kind: "research-fund",
          key: `book:${book.id}`,
          bookId: String(book.id),
          politicianId: String(book.politicianId),
          name: book.politician.name,
          year: book.financialYear,
          draftCount: book._count.journalEntries,
        }),
      ),
    ];
  }
}
