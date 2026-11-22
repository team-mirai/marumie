import type { ScanJobStatus } from "@/server/contexts/research-fund/domain/models/scan-batch";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

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

/**
 * ジョブの状態の移り変わり。キーの状態から移ってよい状態を並べる。
 * - queued → running: 処理が着手する
 * - running → succeeded / failed: 読み取りが終わる
 * - running → queued: 失効したジョブを処理が拾い直す（関数が途中で落ちた場合）
 * - failed → queued: 人が再実行する
 */
const SCAN_JOB_TRANSITIONS: Readonly<Record<ScanJobStatus, readonly ScanJobStatus[]>> = {
  queued: ["running"],
  running: ["succeeded", "failed", "queued"],
  succeeded: [],
  failed: ["queued"],
};

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

  canTransition(from: ScanJobStatus, to: ScanJobStatus): boolean {
    return SCAN_JOB_TRANSITIONS[from].includes(to);
  },

  /**
   * 人がジョブを再実行（待機中に戻す）してよいか。失敗したジョブだけが再実行できる。
   * running → queued は失効の拾い直しで、人の操作ではないので含めない。
   * 見つからないジョブ（null）も再実行できない。valid なら戻す前の状態を返す。
   */
  retry(status: ScanJobStatus | null): ResearchFundResult<ScanJobStatus> {
    if (status !== "failed" || !ScanJob.canTransition(status, "queued"))
      return ScanJob.retryRejection();
    return { status: "valid", value: status };
  },

  /** 再実行できないときの却下理由。判定の後に別の操作で状態が変わっていた場合にも使う */
  retryRejection(): ResearchFundResult<never> {
    return invalidResearchFundResult(
      "jobId",
      RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
      "このジョブは再実行できません。画面を再読み込みしてください",
    );
  },

  /** 読み直しのジョブか。読み直しのジョブは指示を持ち、成功したら書類の下書きを置き換える */
  isReread(job: { rereadInstruction: string | null }): boolean {
    return job.rereadInstruction !== null;
  },
};

/** ジョブの処理を続けられない理由。メッセージはジョブの error にそのまま残し、画面に出す */
export class ScanJobError extends Error {}
