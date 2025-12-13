import "server-only";

import { MfCsvLoader } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";
import { MfRecordConverter } from "@/server/contexts/data-import/infrastructure/mf/mf-record-converter";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { TransactionValidator } from "@/server/contexts/data-import/domain/services/transaction-validator";
import {
  createEmptyPreviewStatistics,
  calculatePreviewStatistics,
  calculatePreviewSummary,
  type PreviewStatistics,
  type PreviewSummary,
} from "@/server/contexts/data-import/domain/services/preview-stats-calculator";
import type { ITransactionRepository } from "@/server/repositories/interfaces/transaction-repository.interface";

export interface PreviewMfCsvInput {
  csvContent: string;
  politicalOrganizationId: string;
}

export interface PreviewMfCsvResult {
  transactions: PreviewTransaction[];
  summary: PreviewSummary;
  statistics: PreviewStatistics;
}

export class PreviewMfCsvUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private csvLoader: MfCsvLoader = new MfCsvLoader(),
    private recordConverter: MfRecordConverter = new MfRecordConverter(),
    private validator: TransactionValidator = new TransactionValidator(),
  ) {}

  async execute(input: PreviewMfCsvInput): Promise<PreviewMfCsvResult> {
    try {
      const csvRecords = await this.csvLoader.load(input.csvContent);

      if (csvRecords.length === 0) {
        return {
          transactions: [],
          summary: calculatePreviewSummary([]),
          statistics: createEmptyPreviewStatistics(),
        };
      }

      // Get existing transactions first
      const transactionNos = csvRecords
        .map((record) => record.transaction_no)
        .filter(Boolean);

      const existingTransactions =
        await this.transactionRepository.findByTransactionNos(transactionNos, [
          input.politicalOrganizationId,
        ]);

      // Convert records to preview transactions
      const convertedTransactions: PreviewTransaction[] = csvRecords.map(
        (record) =>
          this.recordConverter.convertRow(
            record,
            input.politicalOrganizationId,
          ),
      );

      // Validate converted transactions including duplicate check
      const previews = this.validator.validatePreviewTransactions(
        convertedTransactions,
        existingTransactions,
      );

      const summary = calculatePreviewSummary(previews);
      const statistics = calculatePreviewStatistics(previews);

      return {
        transactions: previews,
        summary,
        statistics,
      };
    } catch (_error) {
      return {
        transactions: [],
        summary: calculatePreviewSummary([]),
        statistics: createEmptyPreviewStatistics(),
      };
    }
  }
}
