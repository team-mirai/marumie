import "server-only";
import type { PrismaClient, ResearchFundDocument as PrismaDocument } from "@prisma/client";
import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(
    input: Omit<ResearchFundDocument, "id" | "createdAt">,
  ): Promise<ResearchFundDocument> {
    const row = await this.prisma.researchFundDocument.create({
      data: { ...input, bookId: BigInt(input.bookId) },
    });
    return this.toModel(row);
  }

  async findById(bookId: string, documentId: string): Promise<ResearchFundDocument | null> {
    const row = await this.prisma.researchFundDocument.findFirst({
      where: { id: BigInt(documentId), bookId: BigInt(bookId) },
    });
    return row ? this.toModel(row) : null;
  }

  async listByBook(bookId: string, limit: number): Promise<ResearchFundDocument[]> {
    const rows = await this.prisma.researchFundDocument.findMany({
      where: { bookId: BigInt(bookId) },
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.map((row) => this.toModel(row));
  }

  private toModel(row: PrismaDocument): ResearchFundDocument {
    return {
      id: row.id.toString(),
      bookId: row.bookId.toString(),
      storageKey: row.storageKey,
      mime: row.mime,
      originalFilename: row.originalFilename,
      createdAt: row.createdAt,
    };
  }
}
