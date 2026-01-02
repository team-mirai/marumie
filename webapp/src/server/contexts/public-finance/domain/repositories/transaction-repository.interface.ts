import type { Transaction } from "@/shared/models/transaction";
import type { TransactionFilters } from "@/types/transaction-filters";

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
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
}

// Sankey集計データの型定義
export interface TransactionCategoryAggregation {
  category: string;
  subcategory?: string;
  totalAmount: number;
}

export interface SankeyCategoryAggregationResult {
  income: TransactionCategoryAggregation[];
  expense: TransactionCategoryAggregation[];
}

export interface SortOptions {
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
}

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findAll(filters?: TransactionFilters, sortOptions?: SortOptions): Promise<Transaction[]>;
  findWithPagination(
    filters?: TransactionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Transaction>>;
  getCategoryAggregationForSankey(
    politicalOrganizationIds: string[],
    financialYear: number,
    categoryType?: "political-category" | "friendly-category",
  ): Promise<SankeyCategoryAggregationResult>;
  getLastUpdatedAt(): Promise<Date | null>;
  findAllWithPoliticalOrganizationName(
    filters?: TransactionFilters,
  ): Promise<Array<Transaction & { political_organization_name: string }>>;
}
