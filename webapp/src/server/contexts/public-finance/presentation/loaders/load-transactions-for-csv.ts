"use server";

import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { PrismaTransactionRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-transaction.repository";
import {
  type GetTransactionsForCsvParams,
  GetTransactionsForCsvUsecase,
} from "@/server/contexts/public-finance/application/usecases/get-transactions-for-csv-usecase";
import {
  TRANSACTION_CSV_HEADERS,
  toTransactionCsvRow,
} from "@/server/contexts/public-finance/domain/models/transaction-csv-row";
import { CACHE_REVALIDATE_SECONDS } from "./constants";

/** ダブルクォートで囲み、中のダブルクォートを二重にする */
const quoteCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;

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

export async function downloadTransactionsCsv(slug: string, year: number) {
  try {
    // すべてのトランザクションを取得
    const data = await loadTransactionsForCsv({
      slugs: [slug],
      financialYear: year,
    });

    // CSVデータを作成
    const csvRows = [
      TRANSACTION_CSV_HEADERS.join(","),
      ...data.transactions.map((transaction) => {
        const row = toTransactionCsvRow(transaction);
        return [
          row.date,
          quoteCsvField(row.politicalOrganizationName),
          row.typeLabel,
          row.amount.toString(),
          quoteCsvField(row.account),
          quoteCsvField(row.friendlyCategory),
          quoteCsvField(row.label),
        ].join(",");
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
