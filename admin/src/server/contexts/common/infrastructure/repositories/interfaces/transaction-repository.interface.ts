import type { Transaction } from "@/shared/models/transaction";
import type {
  TransactionFilters,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/server/contexts/shared/domain/transaction";
import type { TransactionWithOrganization } from "@/server/contexts/common/application/usecases/get-transactions-usecase";

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
      where: { politicalOrganizationId: bigint; transactionNo: string };
      update: UpdateTransactionInput;
    }>,
  ): Promise<Transaction[]>;
  deleteAll(filters?: TransactionFilters): Promise<number>;
  createMany(inputs: CreateTransactionInput[]): Promise<Transaction[]>;
  findByTransactionNos(
    transactionNos: string[],
    politicalOrganizationIds?: string[],
  ): Promise<Transaction[]>;
}
