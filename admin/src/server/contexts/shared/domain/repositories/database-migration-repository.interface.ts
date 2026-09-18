export interface IDatabaseMigrationRepository {
  /**
   * 適用済みの最新マイグレーション名を返す。取得できない場合は null。
   * 環境間同期で「書き出し元と取り込み先のスキーマが揃っているか」を判定するために使う。
   */
  findLatestAppliedMigrationName(): Promise<string | null>;
}
