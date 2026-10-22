import "server-only";
import {
  DocumentUploadKey,
  type DocumentUploadOwner,
} from "@/server/contexts/research-fund/domain/models/document-upload";
import { validateScanUpload } from "@/server/contexts/research-fund/domain/models/scan-batch";
import type {
  DocumentUploadStorage,
  DocumentUploadTarget,
} from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 書類（書類スキャン・あとからの紐づけ）をブラウザから原本のバケットへ直接置くための、
 * アップロード先（キーと署名付き URL）をファイルごとに発行する（#1824）。
 *
 * スキャンした PDF は Vercel の関数のリクエストボディ上限（4.5MB）を超えるので、ファイル本体は関数を通さない。
 * キーはユーザーと議員ごとの接頭辞の下に作り、登録時にその接頭辞で発行先を確かめる。
 * 選ばれたファイルの形式・サイズはブラウザの申告なので、実際の中身は登録時に確かめる。
 */
export class PrepareDocumentUploadsUsecase {
  constructor(private storage: DocumentUploadStorage) {}

  async execute(input: {
    owner: DocumentUploadOwner;
    files: { mime: string; size: number }[];
  }): Promise<ResearchFundResult<DocumentUploadTarget[]>> {
    const validation = validateScanUpload(input.files);
    if (validation.status === "invalid") return validation;
    const prefix = DocumentUploadKey.prefix(input.owner);
    const targets = await Promise.all(
      input.files.map(() => this.storage.createUploadTarget(prefix)),
    );
    return { status: "valid", value: targets };
  }
}
