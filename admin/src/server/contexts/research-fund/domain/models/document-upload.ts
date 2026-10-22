import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 書類（領収書・請求書の原本）1 ファイルあたりのサイズの上限（#1824）。
 *
 * 読み取りは PDF・画像をそのまま LLM（Anthropic API）に渡し、base64 にすると約 1.33 倍になる。
 * API のリクエスト上限 32MB に、プロンプトの分を残して収まる大きさにする（20MB → 約 26.7MB）。
 * ストレージのバケットの上限（ローカルは supabase/config.toml の private-receipts で 50MiB）より小さい。
 */
export const DOCUMENT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

/** 画面の案内文・エラーに出す上限の表記 */
export const DOCUMENT_UPLOAD_MAX_SIZE_LABEL = "20MB";

/** ブラウザがストレージへ直接置く書類のキーの接頭辞。登録時に正式なキーへ移す */
const UPLOAD_KEY_ROOT = "uploads";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** アップロードしたユーザーと、書き込み先の議員。キーはこの組に結びつけて発行する */
export interface DocumentUploadOwner {
  politicianId: string;
  userId: string;
}

/** ブラウザがストレージへ直接置いた書類。登録時はキーと元ファイル名だけを受け取る */
export interface DocumentUpload {
  uploadKey: string;
  originalFilename: string;
}

/** 選んだファイルのサイズが上限を超えていれば理由を返す。通れば null（ブラウザとサーバーで共有する） */
export function documentUploadSizeError(size: number, filename?: string): string | null {
  if (!Number.isFinite(size) || size <= 0)
    return `空のファイルはアップロードできません${filename ? `（${filename}）` : ""}`;
  if (size > DOCUMENT_UPLOAD_MAX_BYTES)
    return `1ファイル${DOCUMENT_UPLOAD_MAX_SIZE_LABEL}までです${filename ? `（${filename}）` : ""}`;
  return null;
}

export const DocumentUploadKey = {
  /**
   * キーの接頭辞。ユーザーと議員ごとに分けるので、登録時に「このユーザーがこの議員のために
   * 発行を受けたキーか」を接頭辞で確かめられる。ストレージへの書き込みは、サーバーが
   * 発行した署名付き URL でしかできない（バケットは非公開）。
   */
  prefix(owner: DocumentUploadOwner): string {
    return `${UPLOAD_KEY_ROOT}/${owner.politicianId}/${owner.userId}/`;
  },
  /** キーが owner に発行された形か。他の議員室の原本（正式なキー）や別のユーザーのキーは通さない */
  belongsTo(uploadKey: string, owner: DocumentUploadOwner): boolean {
    const prefix = DocumentUploadKey.prefix(owner);
    return uploadKey.startsWith(prefix) && UUID_PATTERN.test(uploadKey.slice(prefix.length));
  },
};

/** ファイルの先頭のバイト列から形式を判定する（ブラウザが申告した MIME は信用しない） */
export function detectDocumentMime(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "application/pdf" | null {
  const startsWith = (signature: number[]) =>
    bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "%PDF-"
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

/** ストレージに置かれた書類の中身を確かめ、実際の形式を返す */
export function validateUploadedDocument(bytes: Uint8Array): ResearchFundResult<string> {
  const sizeError = documentUploadSizeError(bytes.length);
  if (sizeError)
    return invalidResearchFundResult("document", RF_ERROR_CODES.INVALID_DOCUMENT, sizeError);
  const mime = detectDocumentMime(bytes);
  if (!mime)
    return invalidResearchFundResult(
      "document",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      "JPEG・PNG・PDFの書類を指定してください（ファイルの中身が対応する形式ではありません）",
    );
  return { status: "valid", value: mime };
}
