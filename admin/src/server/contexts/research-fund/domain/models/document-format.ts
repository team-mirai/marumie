import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 受け付ける書類（領収書・請求書の原本）の形式。アップロード時の検証・読み取り・黒塗り・
 * 提出用ファイルの拡張子はすべてここから導く。形式を足すときはここだけを直す。
 * signature はファイルの先頭のバイト列（ブラウザが申告した MIME は信用せず、中身で判定する）。
 */
const DOCUMENT_FORMATS = {
  "image/jpeg": { extension: "jpg", signature: [0xff, 0xd8, 0xff] },
  "image/png": { extension: "png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // "%PDF-"
  "application/pdf": { extension: "pdf", signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
} as const satisfies Record<string, { extension: string; signature: readonly number[] }>;

/** 受け付ける書類の MIME */
export type DocumentMime = keyof typeof DOCUMENT_FORMATS;

/** 受け付ける書類の MIME の一覧（ファイル選択の accept にも使う） */
export const DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_FORMATS) as DocumentMime[];

/** 対応していない形式のときの却下理由 */
const UNSUPPORTED_MESSAGES = {
  upload: "JPG・PNG・PDFのみアップロードできます",
  extraction: "JPG・PNG・PDFのみ読み取れます",
  masking: "JPG・PNG・PDFのみ公開用の版を作れます",
} as const;

/** 形式を受け付けない操作 */
type DocumentOperation = keyof typeof UNSUPPORTED_MESSAGES;

export const DocumentFormat = {
  isSupported(mime: string): mime is DocumentMime {
    return (DOCUMENT_MIME_TYPES as readonly string[]).includes(mime);
  },
  /** 提出用ファイルの拡張子。対応していない形式なら null */
  extension(mime: string): string | null {
    return DocumentFormat.isSupported(mime) ? DOCUMENT_FORMATS[mime].extension : null;
  },
  /** ファイルの先頭のバイト列から形式を判定する。対応する形式でなければ null */
  detect(bytes: Uint8Array): DocumentMime | null {
    return (
      DOCUMENT_MIME_TYPES.find((mime) => {
        const { signature } = DOCUMENT_FORMATS[mime];
        return (
          bytes.length >= signature.length &&
          signature.every((byte, index) => bytes[index] === byte)
        );
      }) ?? null
    );
  },
  /** 対応していない形式のときの却下理由。対応していれば null */
  unsupportedReason(mime: string, operation: DocumentOperation): string | null {
    return DocumentFormat.isSupported(mime) ? null : UNSUPPORTED_MESSAGES[operation];
  },
  /** 操作の対象にできる形式か確かめ、受け付ける MIME として返す */
  validate(mime: string, operation: DocumentOperation): ResearchFundResult<DocumentMime> {
    if (DocumentFormat.isSupported(mime)) return { status: "valid", value: mime };
    return invalidResearchFundResult(
      "document",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      UNSUPPORTED_MESSAGES[operation],
    );
  },
};
