/**
 * MFクラウド会計の CSV として読めないときのエラー（見出し行に認識できる列が無いなど）。
 * メッセージは利用者にそのまま表示する。
 */
export class MfCsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MfCsvFormatError";
  }
}
