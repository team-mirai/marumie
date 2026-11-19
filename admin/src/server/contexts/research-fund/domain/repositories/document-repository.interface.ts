import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";

export interface DocumentRepository {
  create(input: Omit<ResearchFundDocument, "id" | "createdAt">): Promise<ResearchFundDocument>;
  findById(bookId: string, documentId: string): Promise<ResearchFundDocument | null>;
  /** 議員のいずれかの帳簿に属する書類を返す（支払先の表記の最初の書類は、選択中とは別の帳簿のことがある） */
  findByPolitician(politicianId: string, documentId: string): Promise<ResearchFundDocument | null>;
  /** 帳簿の書類を新しい順に最大 limit 件返す（プロンプトのテスト実行で選ぶ候補） */
  listByBook(bookId: string, limit: number): Promise<ResearchFundDocument[]>;
}
