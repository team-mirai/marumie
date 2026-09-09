import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";

export type BulkDeleteSearchResult = {
  success: boolean;
  foundTransactions?: Array<{
    id: string;
    transactionNo: string;
    description: string;
    debitAmount: number;
    creditAmount: number;
    /** ISO 8601 文字列。表示側で YYYY.MM.DD に整形する */
    /** ISO 8601 文字列。表示側で YYYY.MM.DD に整形する */
    transactionDate: string;
  }>;
  notFoundNos?: string[];
  error?: string;
};

export async function loadTransactionsByNos(
  organizationId: string,
  transactionNos: string[],
): Promise<BulkDeleteSearchResult> {
  try {
    const repository = new PrismaTransactionRepository(prisma);
    const found = await repository.findByTransactionNos(transactionNos, [organizationId]);

    const foundNos = new Set(found.map((t) => t.transaction_no));
    const notFoundNos = transactionNos.filter((no) => !foundNos.has(no));

    return {
      success: true,
      foundTransactions: found.map((t) => ({
        id: t.id,
        transactionNo: t.transaction_no,
        description: t.description || "",
        debitAmount: t.debit_amount,
        creditAmount: t.credit_amount,
        transactionDate: new Date(t.transaction_date).toISOString(),
      })),
      notFoundNos,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "検索中にエラーが発生しました",
    };
  }
}
