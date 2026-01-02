import "server-only";

/**
 * CSVフォーマットエラー
 * CSVヘッダーの不正、行数上限超過などのフォーマット関連エラー
 */
export class CsvFormatError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CsvFormatError";
  }
}

/**
 * 処理エラー
 * CSV処理中の予期しないエラー
 */
export class ProcessingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProcessingError";
  }
}
