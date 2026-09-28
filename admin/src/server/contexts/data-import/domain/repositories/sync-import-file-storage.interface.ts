/** ブラウザがファイル本体を直接置くための、一度きりのアップロード先。 */
export interface SyncImportUploadTarget {
  /** 確認・取り込みのときにサーバーへ渡すキー。 */
  storageKey: string;
  /** ブラウザが PUT でファイル本体を送る署名付き URL。 */
  uploadUrl: string;
}

/**
 * 同期用 JSON の置き場所。
 * ファイル本体は Vercel の関数のリクエストボディ上限（4.5MB）を超えるので、
 * ブラウザからストレージへ直接置かせ、サーバーはキーで読み出す。
 */
export interface ISyncImportFileStorage {
  createUploadTarget(): Promise<SyncImportUploadTarget>;
  /** 置かれたファイルを文字列として読み出す。無ければ SyncImportStorageError。 */
  readText(storageKey: string): Promise<string>;
  remove(storageKey: string): Promise<void>;
}
