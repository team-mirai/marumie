import type {
  ReceiptNumberAssignment,
  ReceiptNumberingDocument,
} from "@/server/contexts/research-fund/domain/models/receipt-number";

export interface ReceiptNumberRepository {
  /** 帳簿のすべての書類（採番済みを含む）と、紐づく公開済みの仕訳の最も早い日付を返す */
  listNumberingDocuments(bookId: string): Promise<ReceiptNumberingDocument[]>;
  /**
   * 帳簿の未採番の書類に番号を振る。1 件でも競合したら（別の操作で採番済み・削除済み・番号の重複）
   * 何も変更しない。
   */
  assign(bookId: string, assignments: readonly ReceiptNumberAssignment[]): Promise<void>;
}
