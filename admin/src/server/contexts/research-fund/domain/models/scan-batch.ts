import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 1 回のアップロードで受け付けられる書類の上限（デザイン: 「1回に最大30枚」） */
export const SCAN_BATCH_MAX_DOCUMENTS = 30;

export const SCAN_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;

/** prisma の ResearchFundScanJobStatus と同じ語彙。画面のピルはこの 4 状態だけを扱う */
export type ScanJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ScanJobView {
  id: string;
  status: ScanJobStatus;
  originalFilename: string;
  mime: string;
  /** 抽出結果の要約。まだ読み取っていなければ null */
  summary: string | null;
  error: string | null;
}

export interface ScanBatchView {
  id: string;
  /** ISO 8601。画面では YYYY.MM.DD で表示する */
  createdAt: string;
  jobs: ScanJobView[];
}

export interface ScanBatchProgress {
  total: number;
  succeeded: number;
  failed: number;
  /** 0〜100 の整数。完了（成功・失敗いずれも）した割合 */
  percent: number;
}

export interface ScanOverview {
  batches: (ScanBatchView & { progress: ScanBatchProgress })[];
  /** ジョブに記録される有効なプロンプト版。未保存なら null（アップロードできない） */
  activePromptVersion: number | null;
  /** 読み取りに使うモデル名。画面の注記に出す */
  model: string;
}

export class ScanBatchError extends Error {}

export function summarizeScanBatch(jobs: ScanJobView[]): ScanBatchProgress {
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  return {
    total: jobs.length,
    succeeded,
    failed,
    percent: jobs.length === 0 ? 0 : Math.round(((succeeded + failed) / jobs.length) * 100),
  };
}

/**
 * アップロードされた書類の枚数と形式を、Storage に触れる前に検証する。
 * 1 枚ごとの中身（空でないか・MIME が対応形式か）は ResearchFundDocument が見る。
 */
export function validateScanUpload(documents: { mime: string }[]): ResearchFundResult<undefined> {
  if (documents.length === 0) {
    return invalidResearchFundResult(
      "documents",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      "書類を1枚以上選んでください",
    );
  }
  if (documents.length > SCAN_BATCH_MAX_DOCUMENTS) {
    return invalidResearchFundResult(
      "documents",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      `1回にアップロードできるのは${SCAN_BATCH_MAX_DOCUMENTS}枚までです`,
    );
  }
  if (
    documents.some(
      (document) => !(SCAN_DOCUMENT_MIME_TYPES as readonly string[]).includes(document.mime),
    )
  ) {
    return invalidResearchFundResult(
      "documents",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      "JPG・PNG・PDFのみアップロードできます",
    );
  }
  return { status: "valid", value: undefined };
}
