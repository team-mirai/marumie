/**
 * 1 回の「処理する」で着手するジョブ数であり、同時に running でいてよい上限でもある。
 * 1 件あたり LLM 呼び出し 1 回なので、サーバーレスのタイムアウト内に収まる件数に留める
 * （設計: ジョブ実行方式）。この数だけ running があれば新たに着手しない（多重実行の防止）。
 */
export const SCAN_JOB_BATCH_SIZE = 2;

/**
 * running のまま放置されたジョブを失効とみなすまでの時間。
 * サーバーレス関数が途中で落ちるとジョブが running で残り、以後の処理が止まるため。
 */
export const SCAN_JOB_STALE_MS = 5 * 60 * 1000;

export const ScanJob = {
  /**
   * 新たに着手してよい件数。running が上限に達していれば 0（＝多重実行しない）。
   */
  claimableCount(runningCount: number): number {
    return Math.max(0, SCAN_JOB_BATCH_SIZE - runningCount);
  },

  /** この時刻より前に始まった running のジョブは失効とみなす（関数が落ちたと判断する） */
  staleBefore(now: Date): Date {
    return new Date(now.getTime() - SCAN_JOB_STALE_MS);
  },
};
