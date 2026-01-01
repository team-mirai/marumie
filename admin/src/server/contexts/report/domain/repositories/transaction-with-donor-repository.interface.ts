import type {
  TransactionWithDonor,
  TransactionWithDonorFilters,
  TransactionWithDonorResult,
  TransactionByDonorFilters,
} from "@/server/contexts/report/domain/models/transaction-with-donor";
import type { TransactionForDonorCsv } from "@/server/contexts/report/domain/models/preview-donor-csv-row";

export interface ITransactionWithDonorRepository {
  findTransactionsWithDonors(
    filters: TransactionWithDonorFilters,
  ): Promise<TransactionWithDonorResult>;

  findByDonor(filters: TransactionByDonorFilters): Promise<TransactionWithDonorResult>;

  existsById(id: bigint): Promise<boolean>;

  findExistingIds(ids: bigint[]): Promise<bigint[]>;

  findByIdWithDonor(id: bigint): Promise<TransactionWithDonor | null>;

  findByIdsWithDonor(ids: bigint[]): Promise<TransactionWithDonor[]>;

  /**
   * Donor CSV 取り込み用: transaction_no で Transaction を一括取得
   * 既存の Donor 紐付け情報も含む
   */
  findByTransactionNosForDonorCsv(
    transactionNos: string[],
    politicalOrganizationId: string,
  ): Promise<TransactionForDonorCsv[]>;
}
