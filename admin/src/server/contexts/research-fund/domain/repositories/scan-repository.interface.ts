import type { ScanBatchView } from "@/server/contexts/research-fund/domain/models/scan-batch";

export interface CreateScanBatchInput {
  bookId: string;
  uploadedById: string;
  promptId: string;
  model: string;
  /** Storage に保存済みの書類。並び順がジョブの並び順になる */
  documents: { storageKey: string; mime: string; originalFilename: string }[];
}

export interface ScanRepository {
  /** バッチ・書類・queued ジョブを 1 トランザクションで作る。作ったバッチ ID を返す */
  createBatch(input: CreateScanBatchInput): Promise<string>;
  /** 帳簿のバッチを新しい順に返す */
  listBatches(bookId: string): Promise<ScanBatchView[]>;
}
