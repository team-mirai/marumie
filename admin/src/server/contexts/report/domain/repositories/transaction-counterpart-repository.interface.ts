export interface TransactionCounterpartData {
  transactionId: bigint;
  counterpartId: bigint;
}

export interface ITransactionCounterpartRepository {
  /**
   * トランザクションIDで取引先紐付けを検索
   */
  findByTransactionId(transactionId: bigint): Promise<TransactionCounterpartData | null>;

  /**
   * 取引先紐付けを作成または更新（upsert）
   */
  upsert(transactionId: bigint, counterpartId: bigint): Promise<void>;

  /**
   * 単一のトランザクションIDで取引先紐付けを削除
   */
  deleteByTransactionId(transactionId: bigint): Promise<void>;

  /**
   * 複数のトランザクションIDで取引先紐付けを削除
   */
  deleteByTransactionIds(transactionIds: bigint[]): Promise<void>;

  /**
   * 複数の取引先紐付けを一括作成
   */
  createMany(data: TransactionCounterpartData[]): Promise<void>;
}
