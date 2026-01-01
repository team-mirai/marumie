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

  /**
   * 複数の取引先紐付けを一括置換（削除と作成をアトミックに実行）
   * 指定されたトランザクションIDの既存紐付けを削除し、新しい紐付けを作成
   */
  replaceMany(transactionIds: bigint[], data: TransactionCounterpartData[]): Promise<void>;
}
