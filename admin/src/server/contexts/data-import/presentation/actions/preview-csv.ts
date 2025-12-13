"use server";

import { bufferToString } from "@/server/contexts/data-import/domain/services/encoding-converter";
import { prisma } from "@/server/lib/prisma";
import { PrismaTransactionRepository } from "@/server/repositories/prisma-transaction.repository";
import { PreviewMfCsvUsecase } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
const transactionRepository = new PrismaTransactionRepository(prisma);
const previewUsecase = new PreviewMfCsvUsecase(transactionRepository);

export interface PreviewCsvRequest {
  file: File;
  politicalOrganizationId: string;
}

export async function previewCsv(
  data: PreviewCsvRequest,
): Promise<PreviewMfCsvResult> {
  "use server";
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

    return result;
  } catch (error) {
    console.error("Preview CSV error:", error);
    throw error instanceof Error
      ? error
      : new Error("サーバー内部エラーが発生しました");
  } finally {
    await prisma.$disconnect();
  }
}
