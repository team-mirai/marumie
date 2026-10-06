import type { ScanBatchView } from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { ScanDraftEntry } from "@/server/contexts/research-fund/domain/services/scan-journal-builder";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import type { RereadCandidate } from "@/server/contexts/research-fund/domain/models/scan-reread";
import type { Payee } from "@/server/contexts/research-fund/domain/models/payee";

export interface CreateScanBatchInput {
  bookId: string;
  uploadedById: string;
  promptId: string;
  model: string;
  /** Storage に保存済みの書類。並び順がジョブの並び順になる */
  documents: { storageKey: string; mime: string; originalFilename: string }[];
}

export interface CreateRereadBatchInput {
  bookId: string;
  uploadedById: string;
  promptId: string;
  model: string;
  /** 読み直す既存の書類。並び順がジョブの並び順になる */
  documentIds: string[];
  /** 読み直し指示。ジョブに記録し、読み取りプロンプトと一緒に LLM に渡す */
  instruction: string;
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
  /** 読み直しジョブの指示。通常のスキャンでは null。null でなければ成功時に書類の下書きを置き換える */
  rereadInstruction: string | null;
}

export interface ScanRepository {
  /** バッチ・書類・queued ジョブを 1 トランザクションで作る。作ったバッチ ID を返す */
  createBatch(input: CreateScanBatchInput): Promise<string>;
  /**
   * 既存の書類を読み直すバッチと queued ジョブ（1書類=1ジョブ）を 1 トランザクションで作る。
   * 書類はバッチに移さない（元のアップロードのバッチに属したまま）。作ったバッチ ID を返す
   */
  createRereadBatch(input: CreateRereadBatchInput): Promise<string>;
  /**
   * 選んだ仕訳のうち、帳簿の下書きで書類が紐づくものについて、その書類を重複なく返す。
   * 書類ごとに、確認済・公開中の仕訳を含むかも返す
   */
  findRereadCandidates(bookId: string, entryIds: string[]): Promise<RereadCandidate[]>;
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
  /**
   * 下書き仕訳と原文 JSON を保存し、ジョブを succeeded にする（1 トランザクション）。
   * 同じ hash の仕訳が既にあれば（同時実行を含む）その明細は読み飛ばし、ジョブの完了は続行する。
   * replaceDrafts なら、同じトランザクションで書類の下書き仕訳を先に消してから作る（読み直し）。
   * そのとき書類に確認済・公開中の仕訳があれば、何も変えずに ScanJobError を投げる。
   * payeeId があれば、作った仕訳すべてにその支払先を「ルール照合」として紐づける。
   * 支払先が帳簿と同じ議員のものでなければ（照合の後に変わった場合を含む）紐づけずに完了する。
   */
  completeJob(input: {
    bookId: string;
    jobId: string;
    documentId: string;
    rawJson: unknown;
    entries: ScanDraftEntry[];
    userId: string;
    replaceDrafts: boolean;
    payeeId: string | null;
  }): Promise<void>;
  /** ジョブを failed にしてエラーを記録する */
  failJob(jobId: string, error: string, rawJson?: unknown): Promise<void>;
  /** failed のジョブを queued に戻す。戻せたら true */
  requeueJob(bookId: string, jobId: string): Promise<boolean>;
  /** 帳簿の議員の支払先（書類の発行元との照合に使う）。別の議員の支払先は返さない */
  payees(bookId: string): Promise<Payee[]>;
  /** 科目マスタ（下書き仕訳の科目解決に使う） */
  accounts(): Promise<ResearchFundAccount[]>;
}
