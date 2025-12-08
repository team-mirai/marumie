import type { PrismaClient } from "@prisma/client";
import type {
  ITransactionXmlRepository,
  OtherIncomeTransactionFilters,
  OtherIncomeTransaction,
} from "./interfaces/transaction-xml-repository.interface";

export class PrismaTransactionXmlRepository
  implements ITransactionXmlRepository
{
  constructor(private prisma: PrismaClient) {}

  async findOtherIncomeTransactions(
    filters: OtherIncomeTransactionFilters,
  ): Promise<OtherIncomeTransaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        politicalOrganizationId: BigInt(filters.politicalOrganizationId),
        financialYear: filters.financialYear,
        transactionType: "income",
        OR: [
          { categoryKey: "other-income" },
          { friendlyCategory: "その他の収入" },
        ],
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        transactionNo: true,
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
      friendlyCategory: t.friendlyCategory,
      label: t.label,
      description: t.description,
      memo: t.memo,
      debitAmount: Number(t.debitAmount),
      creditAmount: Number(t.creditAmount),
    }));
  }
}
