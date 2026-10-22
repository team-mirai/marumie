import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import {
  type DocumentUpload,
  DocumentUploadKey,
  type DocumentUploadOwner,
  validateUploadedDocument,
} from "@/server/contexts/research-fund/domain/models/document-upload";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { DocumentUploadStorage } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export interface ClaimedDocument {
  storageKey: string;
  mime: string;
  originalFilename: string;
}

/**
 * ストレージを触る前に、登録しようとしている書類のキーと元ファイル名を確かめる。
 * キーが owner に発行された形でなければ（他の議員室の原本・別のユーザーのアップロードなど）通さない。
 */
export function validateDocumentUpload(
  upload: DocumentUpload,
  owner: DocumentUploadOwner,
): ResearchFundResult<undefined> {
  if (!DocumentUploadKey.belongsTo(upload.uploadKey, owner))
    return invalidResearchFundResult(
      "document",
      RF_ERROR_CODES.INVALID_DOCUMENT,
      "アップロードした書類を確認できませんでした。もう一度選び直してください",
    );
  return ResearchFundDocument.validateFilename(upload.originalFilename);
}

/**
 * ブラウザが置いた書類を正式なキーへ移し、中身（形式・サイズ）を確かめる（#1824）。
 * 呼び出し前に validateDocumentUpload を通しておくこと。
 * 中身が対応していなければ、移した原本を消して invalid を返す。
 */
export async function claimUploadedDocument(
  storage: DocumentStorage & DocumentUploadStorage,
  upload: DocumentUpload,
): Promise<ResearchFundResult<ClaimedDocument>> {
  const claimed = await storage.claimUpload(upload.uploadKey);
  if (claimed.status === "invalid") return claimed;
  const storageKey = claimed.value;
  let content: ResearchFundResult<string>;
  try {
    const downloaded = await storage.download(storageKey);
    content =
      downloaded.status === "invalid" ? downloaded : validateUploadedDocument(downloaded.value);
  } catch (error) {
    await removeOrAggregate(storage, storageKey, error);
    throw error;
  }
  if (content.status === "invalid") {
    await removeOrAggregate(storage, storageKey, null);
    return content;
  }
  return {
    status: "valid",
    value: { storageKey, mime: content.value, originalFilename: upload.originalFilename },
  };
}

async function removeOrAggregate(
  storage: DocumentStorage,
  storageKey: string,
  cause: unknown,
): Promise<void> {
  try {
    await storage.remove(storageKey);
  } catch (cleanupError) {
    throw cause === null
      ? cleanupError
      : new AggregateError(
          [cause, cleanupError],
          "書類の確認とアップロード済み原本の削除に失敗しました",
        );
  }
}
