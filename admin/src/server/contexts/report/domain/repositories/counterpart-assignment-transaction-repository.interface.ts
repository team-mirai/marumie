import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";

/**
 * Counterpart割り当て操作用のTransactionリポジトリインターフェース
 * Interface Segregation Principleに基づき、Counterpart管理に必要なメソッドのみを定義
 */
export interface ICounterpartAssignmentTransactionRepository {
  /**
   * トランザクションIDで存在確認
   */
  existsById(id: bigint): Promise<boolean>;

  /**
   * 複数のトランザクションIDで存在するIDのリストを取得
   */
  findExistingIds(ids: bigint[]): Promise<bigint[]>;

  /**
   * トランザクションIDでCounterpart情報付きのトランザクションを取得
   */
  findByIdWithCounterpart(id: bigint): Promise<TransactionWithCounterpart | null>;
}
