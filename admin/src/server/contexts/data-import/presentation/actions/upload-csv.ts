import "server-only";

import { revalidateTag } from "next/cache";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";
import { SavePreviewTransactionsUsecase } from "@/server/contexts/data-import/application/usecases/save-preview-transactions-usecase";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
const transactionRepository = new PrismaTransactionRepository(prisma);
const uploadUsecase = new SavePreviewTransactionsUsecase(transactionRepository);

export interface UploadCsvRequest {
  validTransactions: PreviewTransaction[];
  politicalOrganizationId: string;
}

export interface UploadCsvResponse {
  ok: boolean;
  processedCount: number;
  savedCount: number;
  skippedCount: number;
  message: string;
  errors?: string[];
}

export async function uploadCsv(
  data: UploadCsvRequest,
): Promise<UploadCsvResponse> {
  "use server";
  try {
    const { validTransactions, politicalOrganizationId } = data;

    if (!validTransactions || !Array.isArray(validTransactions)) {
      throw new Error("有効なトランザクションデータが指定されていません");
    }

    if (!politicalOrganizationId) {
      throw new Error("政治団体IDが指定されていません");
    }

    const result = await uploadUsecase.execute({
      validTransactions,
      politicalOrganizationId,
    });

    if (result.errors.length > 0) {
      return {
        ok: false,
        processedCount: result.processedCount,
        savedCount: result.savedCount,
        skippedCount: result.skippedCount,
        message: `${result.processedCount}件を処理し、${result.savedCount}件を保存、${result.skippedCount}件をスキップしました`,
        errors: result.errors,
      };
    }

    const message =
      result.skippedCount > 0
        ? `${result.processedCount}件を処理し、${result.savedCount}件を新規保存、${result.skippedCount}件を重複のためスキップしました`
        : `${result.processedCount}件を処理し、${result.savedCount}件を保存しました`;

    // キャッシュを無効化してトランザクション一覧を更新
    revalidateTag("transactions-data");
    revalidateTag("transactions-for-csv");

    return {
      ok: true,
      processedCount: result.processedCount,
      savedCount: result.savedCount,
      skippedCount: result.skippedCount,
      message,
    };
  } catch (error) {
    console.error("Upload CSV error:", error);
    throw error instanceof Error
      ? error
      : new Error("サーバー内部エラーが発生しました");
  }
}
