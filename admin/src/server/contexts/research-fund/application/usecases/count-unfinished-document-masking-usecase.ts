import "server-only";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

/** 帳簿の書類のうち、公開用の版がまだ作られていない（未作成・作成中の）件数を返す（#1802） */
export class CountUnfinishedDocumentMaskingUsecase {
  constructor(private repository: DocumentMaskingRepository) {}

  async execute(bookId: string): Promise<number> {
    const { pending, running } = await this.repository.countUnfinished(bookId);
    return pending + running;
  }
}
