"use server";

import { bufferToString } from "@/server/contexts/data-import/domain/services/encoding-converter";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-donor.repository";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";
import { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import {
  PreviewDonorCsvUsecase,
  type PreviewDonorCsvResult,
} from "@/server/contexts/report/application/usecases/preview-donor-csv-usecase";

export interface PreviewDonorCsvRequest {
  file: File;
  politicalOrganizationId: string;
}

export async function previewDonorCsv(
  data: PreviewDonorCsvRequest,
): Promise<PreviewDonorCsvResult> {
  "use server";
  try {
    const { file, politicalOrganizationId } = data;

    if (!file) {
      throw new Error("ファイルが選択されていません");
    }

    if (!politicalOrganizationId) {
      throw new Error("政治団体IDが指定されていません");
    }

    const csvBuffer = Buffer.from(await file.arrayBuffer());
    const csvContent = bufferToString(csvBuffer);

    const csvLoader = new DonorCsvLoader();
    const recordConverter = new DonorCsvRecordConverter();
    const validator = new DonorCsvValidator();
    const transactionRepository = new PrismaTransactionWithDonorRepository(prisma);
    const donorRepository = new PrismaDonorRepository(prisma);

    const usecase = new PreviewDonorCsvUsecase(
      csvLoader,
      recordConverter,
      validator,
      transactionRepository,
      donorRepository,
    );

    const result = await usecase.execute({
      csvContent,
      politicalOrganizationId,
    });

    return result;
  } catch (error) {
    console.error("Preview Donor CSV error:", error);
    if (error instanceof Error) {
      if (error.message.includes("Invalid CSV") || error.message.includes("CSVの行数が上限")) {
        throw new Error("CSVファイルの形式が正しくありません。テンプレートを確認してください");
      }
      if (error.message.includes("Failed to") || error.message.includes("失敗")) {
        throw new Error("処理に失敗しました。時間をおいて再度お試しください");
      }
      throw error;
    }
    throw new Error("予期しないエラーが発生しました");
  }
}
