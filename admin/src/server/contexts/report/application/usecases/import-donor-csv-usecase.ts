import "server-only";

import type { IDonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import type { IDonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import type { IDonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type {
  DonorType,
  CreateDonorInput,
  Donor,
} from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type { ITransactionDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import type { ITransactionManager } from "@/server/contexts/report/domain/repositories/transaction-manager.interface";
import { NoValidRowsError } from "@/server/contexts/report/domain/errors/donor-csv-error";

export interface ImportDonorCsvInput {
  csvContent: string;
  politicalOrganizationId: string;
}

export interface ImportDonorCsvOutput {
  importedCount: number;
  createdDonorCount: number;
}

interface ValidRowWithTransaction extends PreviewDonorCsvRow {
  transactionId: string;
  donorType: DonorType;
}

export class ImportDonorCsvUsecase {
  constructor(
    private readonly csvLoader: IDonorCsvLoader,
    private readonly recordConverter: IDonorCsvRecordConverter,
    private readonly validator: IDonorCsvValidator,
    private readonly transactionRepository: ITransactionWithDonorRepository,
    private readonly donorRepository: IDonorRepository,
    private readonly transactionDonorRepository: ITransactionDonorRepository,
    private readonly transactionManager: ITransactionManager,
  ) {}

  async execute(input: ImportDonorCsvInput): Promise<ImportDonorCsvOutput> {
    const csvRecords = this.csvLoader.load(input.csvContent);

    if (csvRecords.length === 0) {
      throw new NoValidRowsError();
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

    const rowsWithMatchingDonor = await this.enrichWithMatchingDonors(rows);

    const validatedRows = this.validator.validate(rowsWithMatchingDonor, transactionMap);

    const validRows = this.extractValidRowsWithTransaction(validatedRows, transactionMap);

    if (validRows.length === 0) {
      throw new NoValidRowsError();
    }

    const deduplicatedRows = this.deduplicateByTransactionNo(validRows);

    return await this.transactionManager.execute(async (tx) => {
      const { createdDonors, donorIdMap } = await this.createNewDonors(deduplicatedRows, tx);

      const pairs = this.buildTransactionDonorPairs(deduplicatedRows, donorIdMap);

      await this.transactionDonorRepository.bulkUpsert(pairs, tx);

      return {
        importedCount: deduplicatedRows.length,
        createdDonorCount: createdDonors.length,
      };
    });
  }

  private getDonorMatchKey(name: string, address: string | null, donorType: DonorType): string {
    return JSON.stringify({ name, address: address ?? "", donorType });
  }

  private async enrichWithMatchingDonors(
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
    const donors = await this.donorRepository.findByMatchCriteriaBatch(uniqueCriteria);

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

  private extractValidRowsWithTransaction(
    rows: PreviewDonorCsvRow[],
    transactionMap: Map<string, TransactionForDonorCsv>,
  ): ValidRowWithTransaction[] {
    return rows
      .filter((row): row is PreviewDonorCsvRow & { donorType: DonorType } => {
        return row.status === "valid" && row.donorType !== null;
      })
      .map((row) => {
        const transaction = transactionMap.get(row.transactionNo);
        if (!transaction) {
          return null;
        }
        return {
          ...row,
          transactionId: transaction.id,
        };
      })
      .filter((row): row is ValidRowWithTransaction => row !== null);
  }

  private deduplicateByTransactionNo(rows: ValidRowWithTransaction[]): ValidRowWithTransaction[] {
    const transactionNoMap = new Map<string, ValidRowWithTransaction>();

    for (const row of rows) {
      transactionNoMap.set(row.transactionNo, row);
    }

    return Array.from(transactionNoMap.values());
  }

  private async createNewDonors(
    rows: ValidRowWithTransaction[],
    tx: Parameters<Parameters<ITransactionManager["execute"]>[0]>[0],
  ): Promise<{ createdDonors: Donor[]; donorIdMap: Map<string, string> }> {
    const rowsNeedingNewDonor = rows.filter((row) => !row.matchingDonor);

    const uniqueDonorMap = new Map<string, CreateDonorInput>();
    for (const row of rowsNeedingNewDonor) {
      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      if (!uniqueDonorMap.has(key)) {
        uniqueDonorMap.set(key, {
          name: row.name,
          address: row.address,
          donorType: row.donorType,
          occupation: row.occupation,
        });
      }
    }

    const uniqueDonors = Array.from(uniqueDonorMap.values());

    const createdDonors = await this.donorRepository.createMany(uniqueDonors, tx);

    const donorIdMap = new Map<string, string>();

    for (const row of rows) {
      if (row.matchingDonor) {
        const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
        donorIdMap.set(key, row.matchingDonor.id);
      }
    }

    for (const created of createdDonors) {
      const key = this.getDonorMatchKey(created.name, created.address, created.donorType);
      donorIdMap.set(key, created.id);
    }

    return { createdDonors, donorIdMap };
  }

  private buildTransactionDonorPairs(
    rows: ValidRowWithTransaction[],
    donorIdMap: Map<string, string>,
  ): { transactionId: bigint; donorId: bigint }[] {
    return rows.map((row) => {
      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      const donorId = donorIdMap.get(key);
      if (!donorId) {
        throw new Error(`Donor not found for key: ${key}`);
      }
      return {
        transactionId: BigInt(row.transactionId),
        donorId: BigInt(donorId),
      };
    });
  }
}
