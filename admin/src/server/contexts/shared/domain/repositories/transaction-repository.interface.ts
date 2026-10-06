import type { Transaction } from "@/shared/models/transaction";
import type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionWithOrganization,
} from "@/server/contexts/shared/domain/transaction";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginationOptions {
  page: number;
  perPage: number;
}

export interface ITransactionRepository {
  findWithPagination(
    filters?: TransactionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<TransactionWithOrganization>>;
  updateMany(
    data: Array<{
      where: { politicalOrganizationId: bigint; financialYear: number; transactionNo: string };
      update: UpdateTransactionInput;
    }>,
  ): Promise<Transaction[]>;
  delete(id: string): Promise<void>;
  deleteAll(filters?: TransactionFilters): Promise<number>;
  createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]>;
  findByTransactionNos(
    transactionNos: string[],
    politicalOrganizationIds?: string[],
  ): Promise<Transaction[]>;
}
