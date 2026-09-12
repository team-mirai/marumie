import type { ScanBatchView } from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { ScanDraftEntry } from "@/server/contexts/research-fund/domain/services/scan-journal-builder";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";

export interface CreateScanBatchInput {
  bookId: string;
  uploadedById: string;
  promptId: string;
  model: string;
  /** Storage に保存済みの書類。並び順がジョブの並び順になる */
  documents: { storageKey: string; mime: string; originalFilename: string }[];
}

/** 着手済み（running にした）ジョブ。読み取りに必要な情報を全部持つ */
export interface ClaimedScanJob {
  id: string;
  documentId: string;
  storageKey: string;
  mime: string;
  originalFilename: string;
  /** ジョブに記録された版のプロンプト本文。読み取りは作成時点の版で行う */
  officePrompt: string;
}

export interface ScanRepository {
  /** バッチ・書類・queued ジョブを 1 トランザクションで作る。作ったバッチ ID を返す */
  createBatch(input: CreateScanBatchInput): Promise<string>;
  /** 帳簿のバッチを新しい順に返す */
  listBatches(bookId: string): Promise<ScanBatchView[]>;
  /** 帳簿に queued または running のジョブが残っている件数 */
  countUnfinished(bookId: string): Promise<{ queued: number; running: number }>;
  /**
   * queued のジョブを古い順に最大 limit 件 running にして返す。
   * 同じジョブを 2 つの実行が同時に掴まないよう、状態の更新は 1 件ずつ条件付きで行う。
   */
  claimJobs(bookId: string, limit: number): Promise<ClaimedScanJob[]>;
  /** running のまま失効したジョブを queued に戻す。戻した件数を返す */
  releaseStaleJobs(bookId: string, staleBefore: Date): Promise<number>;
  /** 下書き仕訳と原文 JSON を保存し、ジョブを succeeded にする（1 トランザクション） */
  completeJob(input: {
    bookId: string;
    jobId: string;
    documentId: string;
    rawJson: unknown;
    entries: ScanDraftEntry[];
    userId: string;
  }): Promise<void>;
  /** ジョブを failed にしてエラーを記録する */
  failJob(jobId: string, error: string, rawJson?: unknown): Promise<void>;
  /** failed のジョブを queued に戻す。戻せたら true */
  requeueJob(bookId: string, jobId: string): Promise<boolean>;
  /** 科目マスタ（下書き仕訳の科目解決に使う） */
  accounts(): Promise<ResearchFundAccount[]>;
}
