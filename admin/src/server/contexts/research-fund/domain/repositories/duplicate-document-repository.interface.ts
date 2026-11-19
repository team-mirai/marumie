import type { ScannedDocument } from "@/server/contexts/research-fund/domain/models/duplicate-document";

export interface DuplicateDocumentRepository {
  /**
   * 帳簿の書類のうち、仕訳が 1 件以上残っているものを、最新の成功した読み取りの原文と
   * 仕訳に紐づく支払先つきで返す（同じ書類を二重にスキャンした可能性の判定に使う）
   */
  listScannedDocuments(bookId: string): Promise<ScannedDocument[]>;
}
