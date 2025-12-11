import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionXmlRepository,
  IncomeTransaction,
  IncomeTransactionFilters,
} from "./interfaces/transaction-xml-repository.interface";

export class PrismaTransactionXmlRepository
  implements ITransactionXmlRepository
{
  constructor(private prisma: PrismaClient) {}

  async findIncomeTransactions(
    filters: IncomeTransactionFilters,
  ): Promise<IncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        categoryKey: { in: ["publication-income", "other-income"] },
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
        categoryKey: true,
        friendlyCategory: true,
        label: true,
        description: true,
        memo: true,
        debitAmount: true,
        creditAmount: true,
      },
    });

    return transactions.map((t) => ({
      transactionNo: t.transactionNo,
      categoryKey: t.categoryKey,
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
    }));
  }
}
