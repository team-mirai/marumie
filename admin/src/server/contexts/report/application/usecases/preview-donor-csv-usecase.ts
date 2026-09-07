import "server-only";

import type { IDonorCsvLoader } from "@/server/contexts/report/domain/repositories/donor-csv-loader.interface";
import type { IDonorCsvRecordConverter } from "@/server/contexts/report/domain/repositories/donor-csv-record-converter.interface";
import type { IDonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import { enrichRowsWithMatchingDonors } from "@/server/contexts/report/domain/services/donor-matcher";
import {
  calculateDonorPreviewSummary,
  type PreviewDonorCsvSummary,
} from "@/server/contexts/report/domain/services/donor-csv-summary-calculator";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";

export interface PreviewDonorCsvInput {
  csvContent: string;
  politicalOrganizationId: string;
}

export interface PreviewDonorCsvResult {
  rows: PreviewDonorCsvRow[];
  summary: PreviewDonorCsvSummary;
}

export class PreviewDonorCsvUsecase {
  constructor(
    private readonly csvLoader: IDonorCsvLoader,
    private readonly recordConverter: IDonorCsvRecordConverter,
    private readonly validator: IDonorCsvValidator,
    private readonly transactionRepository: ITransactionWithDonorRepository,
    private readonly donorRepository: IDonorRepository,
  ) {}

  async execute(input: PreviewDonorCsvInput): Promise<PreviewDonorCsvResult> {
    try {
      const csvRecords = this.csvLoader.load(input.csvContent);

      if (csvRecords.length === 0) {
        return {
          rows: [],
          summary: calculateDonorPreviewSummary([]),
        };
      }

      const rows = csvRecords.map((record) => this.recordConverter.convert(record));

      const transactionNos = [...new Set(rows.map((row) => row.transactionNo).filter(Boolean))];

      const transactions = await this.transactionRepository.findByTransactionNosForDonorCsv(
        transactionNos,
        input.politicalOrganizationId,
      );
      const transactionMap = new Map<string, TransactionForDonorCsv>(
        transactions.map((t) => [t.transactionNo, t]),
      );

      const rowsWithMatchingDonor = await enrichRowsWithMatchingDonors(rows, this.donorRepository);

      const validatedRows = this.validator.validate(rowsWithMatchingDonor, transactionMap);

      const summary = calculateDonorPreviewSummary(validatedRows);

      return { rows: validatedRows, summary };
    } catch (error) {
      throw new Error(
        `プレビュー処理に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  }
}
