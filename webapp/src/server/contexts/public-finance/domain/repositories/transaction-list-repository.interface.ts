import type { Transaction } from "@/shared/models/transaction";
import type { TransactionFilters } from "@/types/transaction-filters";

/**
 * ページネーション結果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * ページネーションオプション
 */
export interface PaginationOptions {
  page: number;
  perPage: number;
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
}

/**
 * ソートオプション
 */
export interface SortOptions {
  sortBy?: "date" | "amount";
  order?: "asc" | "desc";
}

/**
 * 取引一覧取得用リポジトリインターフェース
 *
 * Interface Segregation Principle に基づき、
 * ITransactionRepository から取引一覧取得機能を分離したインターフェース。
 */
export interface ITransactionListRepository {
  /**
   * フィルター条件とページネーションオプションに基づいて取引を取得する
   * @param filters フィルター条件
   * @param pagination ページネーションオプション
   * @returns ページネーション付き取引結果
   */
  findWithPagination(
    filters?: TransactionFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Transaction>>;

  /**
   * フィルター条件に基づいて全件取引を取得する
   * @param filters フィルター条件
   * @param sortOptions ソートオプション
   * @returns 取引配列
   */
  findAll(filters?: TransactionFilters, sortOptions?: SortOptions): Promise<Transaction[]>;

  /**
   * 最終更新日時を取得する
   * @returns 最終更新日時（存在しない場合はnull）
   */
  getLastUpdatedAt(): Promise<Date | null>;
}
