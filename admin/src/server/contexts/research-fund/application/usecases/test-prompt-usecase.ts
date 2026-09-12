import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import {
  normalizePromptBody,
  type PromptTestDocument,
} from "@/server/contexts/research-fund/domain/models/prompt";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { ReceiptExtractionGateway } from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** テスト実行の候補に出す書類の上限。多すぎる select を避けるためだけの数 */
export const PROMPT_TEST_DOCUMENT_LIMIT = 50;

const EXTRACTABLE_MIMES: readonly string[] = ["image/jpeg", "image/png", "application/pdf"];

type ExtractableMime = "image/jpeg" | "image/png" | "application/pdf";

/**
 * 編集中のプロンプトで既存の書類 1 枚を読み取り、抽出 JSON だけを返す。
 *
 * スキャンジョブと同じゲートウェイを呼ぶが、**何も保存しない**（ジョブ・下書き仕訳・raw_json を作らない）。
 * プロンプトを直したときに本番の帳簿を汚さず結果を確かめるための経路。
 */
export class TestPromptUsecase {
  constructor(
    private documentRepository: DocumentRepository,
    private storage: DocumentStorage,
    private gateway: ReceiptExtractionGateway,
  ) {}

  /** テスト実行で選べる書類を新しい順に返す */
  async listDocuments(bookId: string): Promise<PromptTestDocument[]> {
    const validation = ResearchFundDocument.validateId(bookId);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    const documents = await this.documentRepository.listByBook(bookId, PROMPT_TEST_DOCUMENT_LIMIT);
    return documents.map((document) => ({
      id: document.id,
      originalFilename: document.originalFilename,
      mime: document.mime,
    }));
  }

  async execute(input: {
    bookId: string;
    documentId: string;
    /** エディタの本文。未保存でよい（版は作らない） */
    officePrompt: unknown;
  }): Promise<ResearchFundResult<ExtractedReceipt>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.documentId),
    ]) {
      if (result.status === "invalid") return result;
    }
    // 保存はしないが、空・長すぎる本文は保存時と同じ基準で弾く（PromptError を投げる）
    const officePrompt = normalizePromptBody(input.officePrompt);

    const document = await this.documentRepository.findById(input.bookId, input.documentId);
    if (!document) {
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "書類が見つかりません",
      );
    }
    if (!EXTRACTABLE_MIMES.includes(document.mime)) {
      return invalidResearchFundResult(
        "document",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "JPG・PNG・PDFのみ読み取れます",
      );
    }
    const bytes = await this.storage.download(document.storageKey);
    if (bytes.status === "invalid") return bytes;

    return await this.gateway.extract({
      document: { bytes: bytes.value, mime: document.mime as ExtractableMime },
      officePrompt,
    });
  }
}
