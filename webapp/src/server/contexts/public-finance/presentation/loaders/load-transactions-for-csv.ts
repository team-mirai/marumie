"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { PrismaTransactionRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-transaction.repository";
import {
  type GetTransactionsForCsvParams,
  GetTransactionsForCsvUsecase,
} from "@/server/contexts/public-finance/application/usecases/get-transactions-for-csv-usecase";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

const loadTransactionsForCsv = (params: GetTransactionsForCsvParams) => {
  const cacheKey = `transactions-for-csv-${params.slugs.join("-")}-${params.financialYear}`;

  return unstable_cache(
    async () => {
      const transactionRepository = new PrismaTransactionRepository(prisma);
      const politicalOrganizationRepository = new PrismaPoliticalOrganizationRepository(prisma);
      const usecase = new GetTransactionsForCsvUsecase(
        transactionRepository,
        politicalOrganizationRepository,
      );

      return await usecase.execute(params);
    },
    [cacheKey],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions-for-csv"] },
  )();
};

export async function downloadTransactionsCsv(slug: string) {
  try {
    // すべてのトランザクションを取得
    const data = await loadTransactionsForCsv({
      slugs: [slug],
      financialYear: 2025,
    });

    // CSVヘッダー
    const headers = ["日付", "政治団体名", "タイプ", "金額", "カテゴリ", "詳細区分", "ラベル"];

    // CSVデータを作成
    const csvRows = [
      headers.join(","),
      ...data.transactions.map((transaction) => {
        const row = [
          new Date(transaction.transaction_date).toISOString().split("T")[0],
          `"${transaction.political_organization_name.replace(/"/g, '""')}"`,
          transaction.transaction_type === "income" ? "収入" : "支出",
          transaction.transaction_type === "income"
            ? transaction.credit_amount.toString()
            : transaction.debit_amount.toString(),
          `"${(transaction.transaction_type === "income" ? transaction.credit_account : transaction.debit_account).replace(/"/g, '""')}"`,
          `"${transaction.friendly_category.replace(/"/g, '""')}"`,
          `"${transaction.label.replace(/"/g, '""')}"`,
        ];
        return row.join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");

    // ダウンロード用のレスポンスを返す
    const now = new Date();
    const timestamp = now.toISOString().split("T")[0];
    const filename = `transactions_${slug}_${timestamp}.csv`;

    return {
      success: true,
      data: csvContent,
      filename,
    };
  } catch (error) {
    console.error("CSV download error:", error);
    return {
      success: false,
      error: "CSVのダウンロードに失敗しました",
    };
  }
}
