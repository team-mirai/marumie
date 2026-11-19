import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { PromptTestDocument } from "@/server/contexts/research-fund/domain/models/prompt";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";

/** テスト実行の候補に出す書類の上限。多すぎる select を避けるためだけの数 */
export const PROMPT_TEST_DOCUMENT_LIMIT = 50;

/** プロンプトのテスト実行で選べる書類を新しい順に返す */
export class ListPromptTestDocumentsUsecase {
  constructor(private documentRepository: DocumentRepository) {}

  async execute(bookId: string): Promise<PromptTestDocument[]> {
    const validation = ResearchFundDocument.validateId(bookId);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);
    const documents = await this.documentRepository.listByBook(bookId, PROMPT_TEST_DOCUMENT_LIMIT);
    return documents.map((document) => ({
      id: document.id,
      originalFilename: document.originalFilename,
      mime: document.mime,
    }));
  }
}
