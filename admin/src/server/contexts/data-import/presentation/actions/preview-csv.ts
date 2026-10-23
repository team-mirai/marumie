"use server";

import { bufferToString } from "@/server/contexts/data-import/domain/services/encoding-converter";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";
import { PreviewMfCsvUsecase } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import { MfCsvFormatError } from "@/server/contexts/data-import/domain/errors/mf-csv-format-error";
import { MfCsvLoader } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";
import { MfRecordConverter } from "@/server/contexts/data-import/infrastructure/mf/mf-record-converter";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
const transactionRepository = new PrismaTransactionRepository(prisma);
const previewUsecase = new PreviewMfCsvUsecase(
  transactionRepository,
  new MfCsvLoader(),
  new MfRecordConverter(),
);

export interface PreviewCsvRequest {
  file: File;
  politicalOrganizationId: string;
}

/**
 * 形式の誤りは本番ビルドでも利用者にメッセージを届けるため、例外ではなく ok: false で返す
 * （サーバーアクションが投げた例外のメッセージは本番では伏せられる）
 */
export type PreviewCsvResponse =
  | { ok: true; result: PreviewMfCsvResult }
  | { ok: false; error: string };

export async function previewCsv(data: PreviewCsvRequest): Promise<PreviewCsvResponse> {
  "use server";
  await requireRole("political_fund");

  try {
    const { file, politicalOrganizationId } = data;

    if (!file) {
      throw new Error("ファイルが選択されていません");
    }

    if (!politicalOrganizationId) {
      throw new Error("政治団体IDが指定されていません");
    }

    // Convert file to buffer and then to properly encoded string
    const csvBuffer = Buffer.from(await file.arrayBuffer());
    const csvContent = bufferToString(csvBuffer);

    const result = await previewUsecase.execute({
      csvContent,
      politicalOrganizationId,
    });

    return { ok: true, result };
  } catch (error) {
    if (error instanceof MfCsvFormatError) {
      return { ok: false, error: error.message };
    }
    console.error("Preview CSV error:", error);
    throw error instanceof Error ? error : new Error("サーバー内部エラーが発生しました");
  } finally {
    await prisma.$disconnect();
  }
}
