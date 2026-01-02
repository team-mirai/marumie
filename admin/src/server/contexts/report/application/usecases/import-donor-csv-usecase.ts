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
  Donor,
  CreateDonorInput,
} from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type { ITransactionDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import { NoValidRowsError } from "@/server/contexts/report/domain/errors/donor-csv-error";

export interface ImportDonorCsvInput {
  csvContent: string;
  politicalOrganizationId: string;
}

export interface ImportDonorCsvOutput {
  importedCount: number;
  createdDonorCount: number;
}

interface ValidRowWithTransaction {
  row: PreviewDonorCsvRow;
  transaction: TransactionForDonorCsv;
}

export class ImportDonorCsvUsecase {
  constructor(
    private readonly csvLoader: IDonorCsvLoader,
    private readonly recordConverter: IDonorCsvRecordConverter,
    private readonly validator: IDonorCsvValidator,
    private readonly transactionRepository: ITransactionWithDonorRepository,
    private readonly donorRepository: IDonorRepository,
    private readonly transactionDonorRepository: ITransactionDonorRepository,
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

    const validRows = validatedRows.filter((row) => row.status === "valid");

    if (validRows.length === 0) {
      throw new NoValidRowsError();
    }

    const deduplicatedRows = this.deduplicateByTransactionNo(validRows, transactionMap);

    const newDonors = await this.createNewDonors(deduplicatedRows);

    const donorMap = await this.buildDonorMap(deduplicatedRows, newDonors);

    const importedCount = await this.createTransactionDonorLinks(
      deduplicatedRows,
      donorMap,
      transactionMap,
    );

    return {
      importedCount,
      createdDonorCount: newDonors.length,
    };
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

  private deduplicateByTransactionNo(
    validRows: PreviewDonorCsvRow[],
    transactionMap: Map<string, TransactionForDonorCsv>,
  ): ValidRowWithTransaction[] {
    const rowByTransactionNo = new Map<string, PreviewDonorCsvRow>();

    for (const row of validRows) {
      rowByTransactionNo.set(row.transactionNo, row);
    }

    const result: ValidRowWithTransaction[] = [];
    for (const [transactionNo, row] of rowByTransactionNo) {
      const transaction = transactionMap.get(transactionNo);
      if (transaction) {
        result.push({ row, transaction });
      }
    }

    return result;
  }

  private async createNewDonors(deduplicatedRows: ValidRowWithTransaction[]): Promise<Donor[]> {
    const rowsNeedingNewDonor = deduplicatedRows.filter(({ row }) => row.matchingDonor === null);

    const uniqueDonorInputs = new Map<string, CreateDonorInput>();

    for (const { row } of rowsNeedingNewDonor) {
      if (row.donorType === null) continue;

      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      if (!uniqueDonorInputs.has(key)) {
        uniqueDonorInputs.set(key, {
          donorType: row.donorType,
          name: row.name,
          address: row.address,
          occupation: row.occupation,
        });
      }
    }

    const createdDonors: Donor[] = [];
    for (const donorInput of uniqueDonorInputs.values()) {
      const donor = await this.donorRepository.create(donorInput);
      createdDonors.push(donor);
    }

    return createdDonors;
  }

  private async buildDonorMap(
    deduplicatedRows: ValidRowWithTransaction[],
    newDonors: Donor[],
  ): Promise<Map<string, Donor>> {
    const donorMap = new Map<string, Donor>();

    for (const donor of newDonors) {
      const key = this.getDonorMatchKey(donor.name, donor.address, donor.donorType);
      donorMap.set(key, donor);
    }

    for (const { row } of deduplicatedRows) {
      if (row.matchingDonor && row.donorType) {
        const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
        if (!donorMap.has(key)) {
          const existingDonor = await this.donorRepository.findById(row.matchingDonor.id);
          if (existingDonor) {
            donorMap.set(key, existingDonor);
          }
        }
      }
    }

    return donorMap;
  }

  private async createTransactionDonorLinks(
    deduplicatedRows: ValidRowWithTransaction[],
    donorMap: Map<string, Donor>,
    transactionMap: Map<string, TransactionForDonorCsv>,
  ): Promise<number> {
    const transactionIds: bigint[] = [];
    const transactionDonorData: { transactionId: bigint; donorId: bigint }[] = [];

    for (const { row } of deduplicatedRows) {
      if (row.donorType === null) continue;

      const transaction = transactionMap.get(row.transactionNo);
      if (!transaction) continue;

      const key = this.getDonorMatchKey(row.name, row.address, row.donorType);
      const donor = donorMap.get(key);
      if (!donor) continue;

      const transactionId = BigInt(transaction.id);
      transactionIds.push(transactionId);
      transactionDonorData.push({
        transactionId,
        donorId: BigInt(donor.id),
      });
    }

    if (transactionDonorData.length > 0) {
      await this.transactionDonorRepository.replaceMany(transactionIds, transactionDonorData);
    }

    return transactionDonorData.length;
  }
}
