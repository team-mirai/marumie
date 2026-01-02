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

// 月次集計データの型定義
export interface MonthlyAggregation {
  yearMonth: string; // "YYYY-MM" 形式
  income: number;
  expense: number;
}

// 日次寄附データの型定義
export interface DailyDonationData {
  date: string; // "YYYY-MM-DD" 形式
  dailyAmount: number; // その日の寄附額
  cumulativeAmount: number; // 累積寄附額
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
  getDailyDonationData(
    politicalOrganizationIds: string[],
    financialYear: number,
  ): Promise<DailyDonationData[]>;
  getLastUpdatedAt(): Promise<Date | null>;
  findAllWithPoliticalOrganizationName(
    filters?: TransactionFilters,
  ): Promise<Array<Transaction & { political_organization_name: string }>>;
}
