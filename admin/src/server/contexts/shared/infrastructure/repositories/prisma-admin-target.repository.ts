import "server-only";
import type { PrismaClient } from "@prisma/client";
import {
  type AdminTarget,
  AdminTargetKey,
  selectableOrganizationYears,
} from "@/server/contexts/shared/domain/models/admin-target";
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
        const years = selectableOrganizationYears(currentYear, [
          ...org.transactions.map((t) => t.financialYear),
          ...org.reportProfiles.map((p) => p.financialYear),
        ]);
        return years.map((year) => ({
          kind: "political-organization",
          key: AdminTargetKey.organization(org.id, year),
          organizationId: String(org.id),
          name: org.displayName,
          year,
        }));
      }),
      ...books.map(
        (book): AdminTarget => ({
          kind: "research-fund",
          key: AdminTargetKey.book(book.id),
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
