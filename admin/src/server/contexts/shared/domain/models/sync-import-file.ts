/**
 * 環境間同期用 JSON の取り込みで、取り込む対象（政治団体・議員室）によらず共通の概念。
 * ファイルの受け渡し（ストレージのキー・大きさ・片付け）と、失敗の種類を置く。
 */

/**
 * ファイルの内容が受け付けられないとき（JSON として壊れている、形式バージョンが未対応、
 * 知らないカラムがある、確認入力が一致しない など）。呼び出し元はそのまま画面に出してよい。
 */
export class SyncImportValidationError extends Error {}

/** この環境では取り込みが許可されていないとき（フラグ未設定 / 本番）。 */
export class SyncImportForbiddenError extends Error {}

/**
 * 置き換えが制限時間内に終わらなかったとき。トランザクションごと取り消されており、DB は元のまま。
 * 途中で黙って切れたのではないことを画面で伝える。
 */
export class SyncImportTimeoutError extends Error {}

/** 取り込み元のストレージにファイルを置けない・読めないとき（バケット未作成、置いたファイルが無い など）。 */
export class SyncImportStorageError extends Error {}

/**
 * 受け付ける同期用 JSON の最大サイズ。
 * ファイルは Vercel の関数（リクエストボディ 4.5MB 上限）を通さずストレージへ直接置くので、
 * 上限はストレージのバケットの上限（supabase/config.toml の sync-imports）に揃える。
 * 取り込み時は関数のメモリ（2GB）にファイル全体を読み込むので、それに収まる大きさに留める。
 */
export const SYNC_IMPORT_MAX_FILE_BYTES = 200 * 1024 * 1024;

/** {@link SYNC_IMPORT_MAX_FILE_BYTES} を画面に出すときの表記。 */
export const SYNC_IMPORT_MAX_FILE_SIZE_LABEL = "200MB";

/** 選ばれたファイルの大きさを受け付けられるか確かめる。受け付けられなければ理由を返す。 */
export function validateSyncImportFileSize(fileSize: number): string | null {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return "ファイルが空です";
  }
  if (fileSize > SYNC_IMPORT_MAX_FILE_BYTES) {
    const megabytes = (fileSize / 1024 / 1024).toFixed(1);
    return `ファイルが大きすぎます（${megabytes}MB）。取り込めるのは ${SYNC_IMPORT_MAX_FILE_SIZE_LABEL} までです`;
  }
  return null;
}

/** ストレージに置いた同期用 JSON のキー。サーバーが発行した形（UUID + .json）だけを受け付ける。 */
const SYNC_IMPORT_STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;

export function isSyncImportStorageKey(value: string): boolean {
  return SYNC_IMPORT_STORAGE_KEY_PATTERN.test(value);
}

/**
 * 取り込まれずにストレージに残った同期用 JSON を消すまでの時間。
 * 確認を見てから取り込むまでの間に消してしまわないよう、画面での作業時間より十分長くとる。
 */
const SYNC_IMPORT_STALE_FILE_AGE_MS = 24 * 60 * 60 * 1000;

/** ストレージに置かれている同期用 JSON 1 件。 */
export interface SyncImportStoredFile {
  storageKey: string;
  createdAt: Date;
}

/**
 * 取り込まれずに {@link SYNC_IMPORT_STALE_FILE_AGE_MS} 以上経った同期用 JSON のキーを選ぶ。
 * サーバーが発行した形のキーだけを対象にし、バケットに置かれた他のものには触れない。
 */
export function selectStaleSyncImportStorageKeys(
  files: readonly SyncImportStoredFile[],
  now: Date,
): string[] {
  const cutoff = now.getTime() - SYNC_IMPORT_STALE_FILE_AGE_MS;
  return files
    .filter((file) => isSyncImportStorageKey(file.storageKey))
    .filter((file) => file.createdAt.getTime() <= cutoff)
    .map((file) => file.storageKey);
}
