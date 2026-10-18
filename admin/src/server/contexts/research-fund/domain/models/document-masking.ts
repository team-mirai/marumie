/**
 * 書類の公開用の版（全ページを画像にして組み直し、個人情報を黒塗りした PDF）の状態（#1802）。
 * - pending: 未作成（作り直しの依頼を受けたものを含む）。帳簿の画面を開いている間に順に作る
 * - running: 作成中
 * - succeeded: 作成済み
 * - failed: 失敗（理由を残す。作り直しの依頼で pending に戻る）
 */
export type DocumentMaskingStatus = "pending" | "running" | "succeeded" | "failed";

/** 画面に出す、書類ごとの公開用の版の状態 */
export interface DocumentMasking {
  documentId: string;
  status: DocumentMaskingStatus;
  /** 失敗したときの理由。失敗以外では null */
  error: string | null;
  /** 黒塗りした箇所の数。作成済みのときだけ値を持つ */
  regionCount: number | null;
  /** 公開用の版のファイルがあるか。作り直しの間・作り直しに失敗したときは前の版が残る */
  hasMaskedVersion: boolean;
}

/**
 * 1 回の呼び出しで作る書類の数であり、同時に running でいてよい上限でもある。
 * 1 書類あたりページ数ぶん LLM を呼ぶので、サーバーレス関数の実行時間の上限に収まるよう 1 件にする。
 * この数だけ running があれば新たに着手しない（多重実行の防止）。
 */
export const MASKING_BATCH_SIZE = 1;

/**
 * running のまま放置された書類を失効とみなすまでの時間。関数の実行時間の上限（300 秒）より長くし、
 * まだ動いている作成を待機に戻さないようにする。
 */
export const MASKING_STALE_MS = 10 * 60 * 1000;

/** 失敗理由として残す文字数の上限 */
const MAX_ERROR_LENGTH = 500;

export const DocumentMaskingPolicy = {
  /** 新たに着手してよい件数。running が上限に達していれば 0（＝多重実行しない） */
  claimableCount(runningCount: number): number {
    return Math.max(0, MASKING_BATCH_SIZE - runningCount);
  },

  /** この時刻より前に始まった running の書類は失効とみなす（関数が落ちたと判断する） */
  staleBefore(now: Date): Date {
    return new Date(now.getTime() - MASKING_STALE_MS);
  },

  /** 作る・作り直す依頼を受けられるか。作成中の書類は二重に作らないため受けない */
  canRequest(status: DocumentMaskingStatus): boolean {
    return status !== "running";
  },

  /** 失敗理由を保存できる長さにする */
  errorMessage(message: string): string {
    return (message.trim() || "公開用の版の作成に失敗しました").slice(0, MAX_ERROR_LENGTH);
  },

  /** ページ数の上限を超えて黒塗りできない書類の失敗理由 */
  pageLimitMessage(pageCount: number, maxPages: number): string {
    return `${pageCount}ページあり、黒塗りできるページ数の上限（${maxPages}ページ）を超えています`;
  },
};
