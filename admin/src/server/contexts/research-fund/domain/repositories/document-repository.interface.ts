import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";

export interface DocumentRepository {
  create(input: Omit<ResearchFundDocument, "id" | "createdAt">): Promise<ResearchFundDocument>;
  findById(bookId: string, documentId: string): Promise<ResearchFundDocument | null>;
  /** 帳簿の書類を新しい順に最大 limit 件返す（プロンプトのテスト実行で選ぶ候補） */
  listByBook(bookId: string, limit: number): Promise<ResearchFundDocument[]>;
}
