import "server-only";

import type { IDonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import type { IDonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import type { IDonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { DonorType, Donor } from "@/server/contexts/report/domain/models/donor";
import {
  calculateDonorPreviewSummary,
  type PreviewDonorCsvSummary,
} from "@/server/contexts/report/domain/services/donor-csv-summary-calculator";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";

export interface PreviewDonorCsvInput {
  tenantId: bigint;
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

      const rowsWithMatchingDonor = await this.enrichWithMatchingDonors(input.tenantId, rows);

      const validatedRows = this.validator.validate(rowsWithMatchingDonor, transactionMap);

      const summary = calculateDonorPreviewSummary(validatedRows);

      return { rows: validatedRows, summary };
    } catch (error) {
      throw new Error(
        `プレビュー処理に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
      );
    }
  }

  private getDonorMatchKey(name: string, address: string | null, donorType: DonorType): string {
    return JSON.stringify({ name, address: address ?? "", donorType });
  }

  private async enrichWithMatchingDonors(
    tenantId: bigint,
    rows: PreviewDonorCsvRow[],
  ): Promise<PreviewDonorCsvRow[]> {
    const searchKeys = new Map<
      string,
      { name: string; address: string | null; donorType: DonorType }
    >();

    for (const row of rows) {
      if (row.donorType === null) continue;
      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      if (!searchKeys.has(key)) {
        searchKeys.set(key, { name: row.name, address: row.address, donorType: row.donorType });
      }
    }

    const uniqueCriteria = [...searchKeys.values()];
    const donors = await this.donorRepository.findByMatchCriteriaBatch(tenantId, uniqueCriteria);

    const donorMap = new Map<string, Donor>(
      donors.map((d) => [this.getDonorMatchKey(d.name, d.address, d.donorType), d]),
    );

    return rows.map((row) => {
      if (row.donorType === null) return row;

      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      const matchingDonor = donorMap.get(key);

      return {
        ...row,
        matchingDonor: matchingDonor
          ? {
              id: matchingDonor.id,
              name: matchingDonor.name,
              donorType: matchingDonor.donorType,
              address: matchingDonor.address,
            }
          : null,
      };
    });
  }
}
