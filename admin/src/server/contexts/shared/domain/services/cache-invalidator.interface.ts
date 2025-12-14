/**
 * キャッシュ無効化サービスのインターフェース
 *
 * usecase からキャッシュ無効化を行うための抽象化レイヤー。
 * 実装詳細（HTTP, Redis など）は infrastructure 層に委譲する。
 */
export interface ICacheInvalidator {
  /**
   * webapp のキャッシュを無効化する
   */
  invalidateWebappCache(): Promise<void>;
}
