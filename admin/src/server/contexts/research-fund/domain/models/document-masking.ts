/**
 * 書類の公開用の版（全ページを画像にして組み直し、個人情報を黒塗りした PDF）の状態（#1802）。
 * - pending: 未作成（作り直しの依頼を受けたものを含む）。キューから呼ばれたサーバー側の処理が順に作る（#1812）
 * - running: 作成中
 * - succeeded: 作成済み
 * - failed: 失敗（理由を残す。作り直しの依頼で pending に戻る）
 *
 * pending / running のときの masking_error は、前回の作成が途中で止まって作り直していることを示す
 * （同じ書類で止まり続けたら失敗にして、際限なく作り直さないため）。画面には失敗のときだけ出す。
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
 * 同時に running でいてよい書類の数の目安。1 書類あたりページ数ぶん LLM を呼ぶので、
 * キューから並んで届いても LLM を一度に呼びすぎないよう、これだけ running があれば新たに着手しない。
 * 着手しなかった分は、作成中の処理が終わったときに次を呼ぶので取りこぼさない（#1812）。
 */
export const MASKING_MAX_RUNNING = 3;

/**
 * running のまま放置された書類を失効とみなすまでの時間。関数の実行時間の上限（300 秒）より長くし、
 * まだ動いている作成を待機に戻さないようにする。定期実行（5 分ごと）と合わせて、止まった書類が
 * おおむね 10 分ほどで作り直しの対象になるよう短めにとる。
 */
export const MASKING_STALE_MS = 6 * 60 * 1000;

/** 失敗理由として残す文字数の上限 */
const MAX_ERROR_LENGTH = 500;

export const DocumentMaskingPolicy = {
  /** 新たに着手してよい件数。running が上限に達していれば 0 */
  claimableCount(runningCount: number): number {
    return Math.max(0, MASKING_MAX_RUNNING - runningCount);
  },

  /** この時刻より前に始まった running の書類は失効とみなす（関数が落ちたと判断する） */
  staleBefore(now: Date): Date {
    return new Date(now.getTime() - MASKING_STALE_MS);
  },

  /** 作る・作り直す依頼を受けられるか。作成中の書類は二重に作らないため受けない */
  canRequest(status: DocumentMaskingStatus): boolean {
    return status !== "running";
  },

  /**
   * 失効した書類の扱い。初めて止まったものは作り直しの対象に戻し、作り直しても止まったものは
   * 失敗にする（同じ書類で処理を際限なく繰り返さない）
   */
  staleOutcome: {
    /** 途中で止まって作り直している書類に残す印（画面には出さない） */
    retryNote: "前回の作成が途中で止まったため、作り直しています",
    /** 作り直しても止まった書類の失敗理由 */
    failure: "作成が途中で止まりました。ページ数を減らすなどしてから作り直してください",
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
