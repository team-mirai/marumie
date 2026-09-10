import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";

export interface DocumentRepository {
  create(input: Omit<ResearchFundDocument, "id" | "createdAt">): Promise<ResearchFundDocument>;
  findById(bookId: string, documentId: string): Promise<ResearchFundDocument | null>;
}
