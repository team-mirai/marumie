import type {
  DocumentMasking,
  DocumentMaskingStatus,
  StalledMaskingDestination,
} from "@/server/contexts/research-fund/domain/models/document-masking";

/** 公開用の版の作成に着手した書類 */
export interface ClaimedMaskingDocument {
  documentId: string;
  storageKey: string;
  mime: string;
  /** 作り直しの依頼で付けた黒塗りへの追加の指示。無ければ null */
  instruction: string | null;
  /** 着手した時刻。完了・失敗の記録は、この時刻のまま running の書類にだけ行う（失効後に別の実行が着手していたら記録しない） */
  startedAt: Date;
}

/** 作成中のまま失効した書類 */
export interface StalledMaskingDocument {
  documentId: string;
  /** 着手した時刻。記録が無ければ null。行き先の記録は、この時刻のまま running の書類にだけ行う */
  startedAt: Date | null;
  /** 書類に残っている理由（作り直しの印）。無ければ null */
  error: string | null;
}

export interface DocumentMaskingRepository {
  /** 帳簿の書類の公開用の版のファイルのキー。書類が無ければ undefined、版がまだ無ければ null */
  findMaskedKey(bookId: string, documentId: string): Promise<string | null | undefined>;
  /** 帳簿の書類の公開用の版の状態を返す */
  listByBook(bookId: string): Promise<DocumentMasking[]>;
  /** すべての帳簿の、公開用の版が未作成・作成中の書類の数 */
  countUnfinished(): Promise<{ pending: number; running: number }>;
  /** staleBefore より前に着手して（または着手した時刻が無いまま）running で残った書類（すべての帳簿） */
  findStalled(staleBefore: Date): Promise<StalledMaskingDocument[]>;
  /**
   * 失効した書類を行き先の状態にし、理由を残す。見つけたときのまま running でなければ
   * （その間に作成が終わっていれば）何もせず false を返す
   */
  release(
    stalled: StalledMaskingDocument,
    destination: StalledMaskingDestination,
  ): Promise<boolean>;
  /**
   * pending の書類（すべての帳簿）のうち最も古いものを running にして返す。無ければ null。
   * 別の実行が先に着手した書類は返さない（同じ書類を二重に作らない）
   */
  claimNext(): Promise<ClaimedMaskingDocument | null>;
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
   * 帳簿の書類が requestable のいずれかの状態のときだけ、作る・作り直す対象（pending）に戻し、
   * 黒塗りへの追加の指示を書類に保存する（null なら指示を消す）。前の版は作り直しが済むまで残す。
   * 戻せなければ何もせず、その時点の状態を返す。書類が無ければ null
   */
  request(
    bookId: string,
    documentId: string,
    instruction: string | null,
    requestable: readonly DocumentMaskingStatus[],
  ): Promise<{ requested: true } | { requested: false; status: DocumentMaskingStatus } | null>;
}
