import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";

/** 公開用の版の作成に着手した書類 */
export interface ClaimedMaskingDocument {
  documentId: string;
  storageKey: string;
  mime: string;
  /** 着手した時刻。完了・失敗の記録は、この時刻のまま running の書類にだけ行う（失効後に別の実行が着手していたら記録しない） */
  startedAt: Date;
}

export interface DocumentMaskingRepository {
  /** 帳簿の書類の公開用の版のファイルのキー。書類が無ければ undefined、版がまだ無ければ null */
  findMaskedKey(bookId: string, documentId: string): Promise<string | null | undefined>;
  /** 帳簿の書類の公開用の版の状態を返す */
  listByBook(bookId: string): Promise<DocumentMasking[]>;
  countUnfinished(bookId: string): Promise<{ pending: number; running: number }>;
  /** staleBefore より前に着手して running のまま残った書類を pending に戻す。戻した件数を返す */
  releaseStale(bookId: string, staleBefore: Date): Promise<number>;
  /** pending の書類を古い順に最大 limit 件 running にして返す。別の実行が先に着手した書類は含まない */
  claim(bookId: string, limit: number): Promise<ClaimedMaskingDocument[]>;
  /**
   * 作った版を記録して作成済みにする。置き換えた前の版のキーを返す（無ければ null）。
   * 着手したときのまま running でなければ何もせず false を返す（呼び出し側は作った版を消す）
   */
  complete(input: {
    claimed: ClaimedMaskingDocument;
    maskedKey: string;
    regionCount: number;
  }): Promise<{ recorded: true; replacedKey: string | null } | { recorded: false }>;
  /** 失敗にして理由を残す。着手したときのまま running でなければ何もしない */
  fail(claimed: ClaimedMaskingDocument, error: string): Promise<void>;
  /**
   * 帳簿の書類を作る・作り直す対象（pending）に戻す。前の版は作り直しが済むまで残す。
   * 書類が無ければ not-found、作成中なら running を返して何もしない
   */
  request(bookId: string, documentId: string): Promise<"requested" | "running" | "not-found">;
}
