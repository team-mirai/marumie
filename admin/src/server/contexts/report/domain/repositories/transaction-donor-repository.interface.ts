import type { PrismaTransactionClient } from "@/server/contexts/report/domain/repositories/transaction-manager.interface";

export interface TransactionDonorData {
  transactionId: bigint;
  donorId: bigint;
}

export interface ITransactionDonorRepository {
  /**
   * トランザクションIDでDonor紐付けを検索
   */
  findByTransactionId(transactionId: bigint): Promise<TransactionDonorData | null>;

  /**
   * Donor紐付けを作成または更新（upsert）
   */
  upsert(transactionId: bigint, donorId: bigint): Promise<void>;

  /**
   * 単一のトランザクションIDでDonor紐付けを削除
   */
  deleteByTransactionId(transactionId: bigint): Promise<void>;

  /**
   * 複数のトランザクションIDでDonor紐付けを削除
   */
  deleteByTransactionIds(transactionIds: bigint[]): Promise<void>;

  /**
   * 複数のDonor紐付けを一括作成
   */
  createMany(data: TransactionDonorData[]): Promise<void>;

  /**
   * 複数のDonor紐付けを一括置換（削除と作成をアトミックに実行）
   * 指定されたトランザクションIDの既存紐付けを削除し、新しい紐付けを作成
   */
  replaceMany(transactionIds: bigint[], data: TransactionDonorData[]): Promise<void>;

  /**
   * 複数のTransactionに対するDonor紐付けを一括でupsertする
   * - 既存の紐付けがあれば donorId を更新（createdAt は保持）
   * - 既存の紐付けがなければ新規作成
   * @param pairs TransactionIdとDonorIdのペア配列
   * @param tx トランザクションコンテキスト
   */
  bulkUpsert(
    pairs: { transactionId: bigint; donorId: bigint }[],
    tx?: PrismaTransactionClient,
  ): Promise<void>;
}
