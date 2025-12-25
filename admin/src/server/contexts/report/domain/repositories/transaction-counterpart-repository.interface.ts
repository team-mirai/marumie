export interface ITransactionCounterpartRepository {
  deleteByTransactionIds(transactionIds: bigint[]): Promise<void>;
}
