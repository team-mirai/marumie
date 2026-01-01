import type {
  TransactionWithDonor,
  TransactionWithDonorFilters,
  TransactionWithDonorResult,
  TransactionByDonorFilters,
} from "@/server/contexts/report/domain/models/transaction-with-donor";

export interface ITransactionWithDonorRepository {
  findTransactionsWithDonors(
    filters: TransactionWithDonorFilters,
  ): Promise<TransactionWithDonorResult>;

  findByDonor(filters: TransactionByDonorFilters): Promise<TransactionWithDonorResult>;

  existsById(id: bigint): Promise<boolean>;

  findExistingIds(ids: bigint[]): Promise<bigint[]>;

  findByIdWithDonor(id: bigint): Promise<TransactionWithDonor | null>;

  findByIdsWithDonor(ids: bigint[]): Promise<TransactionWithDonor[]>;
}
