import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
} from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

export class PrismaDocumentMaskingRepository implements DocumentMaskingRepository {
  constructor(private prisma: PrismaClient) {}

  async findMaskedKey(bookId: string, documentId: string): Promise<string | null | undefined> {
    const row = await this.prisma.researchFundDocument.findFirst({
      where: { id: BigInt(documentId), bookId: BigInt(bookId) },
      select: { maskedKey: true },
    });
    return row ? row.maskedKey : undefined;
  }

  async listByBook(bookId: string): Promise<DocumentMasking[]> {
    const rows = await this.prisma.researchFundDocument.findMany({
      where: { bookId: BigInt(bookId) },
      select: {
        id: true,
        maskingStatus: true,
        maskingError: true,
        maskedRegionCount: true,
        maskedKey: true,
      },
      orderBy: { id: "asc" },
    });
    return rows.map((row) => ({
      documentId: row.id.toString(),
      status: row.maskingStatus,
      error: row.maskingError,
      regionCount: row.maskedRegionCount,
      hasMaskedVersion: row.maskedKey !== null,
    }));
  }

  async countUnfinished(bookId: string): Promise<{ pending: number; running: number }> {
    const rows = await this.prisma.researchFundDocument.groupBy({
      by: ["maskingStatus"],
      where: { bookId: BigInt(bookId), maskingStatus: { in: ["pending", "running"] } },
      _count: { _all: true },
    });
    const count = (status: "pending" | "running") =>
      rows.find((row) => row.maskingStatus === status)?._count._all ?? 0;
    return { pending: count("pending"), running: count("running") };
  }

  async releaseStale(bookId: string, staleBefore: Date): Promise<number> {
    const result = await this.prisma.researchFundDocument.updateMany({
      where: {
        bookId: BigInt(bookId),
        maskingStatus: "running",
        OR: [{ maskingStartedAt: null }, { maskingStartedAt: { lt: staleBefore } }],
      },
      data: { maskingStatus: "pending", maskingStartedAt: null },
    });
    return result.count;
  }

  async claim(bookId: string, limit: number): Promise<ClaimedMaskingDocument[]> {
    const candidates = await this.prisma.researchFundDocument.findMany({
      where: { bookId: BigInt(bookId), maskingStatus: "pending" },
      orderBy: { id: "asc" },
      take: limit,
      select: { id: true, storageKey: true, mime: true },
    });
    const claimed: ClaimedMaskingDocument[] = [];
    for (const document of candidates) {
      const startedAt = new Date();
      // 同時に走った別の実行が先に着手していたら count は 0 になる。その分は諦めて次へ。
      const result = await this.prisma.researchFundDocument.updateMany({
        where: { id: document.id, maskingStatus: "pending" },
        data: { maskingStatus: "running", maskingStartedAt: startedAt, maskingError: null },
      });
      if (result.count !== 1) continue;
      claimed.push({
        documentId: document.id.toString(),
        storageKey: document.storageKey,
        mime: document.mime,
        startedAt,
      });
    }
    return claimed;
  }

  async complete(input: {
    claimed: ClaimedMaskingDocument;
    maskedKey: string;
    regionCount: number;
  }): Promise<{ recorded: true; replacedKey: string | null } | { recorded: false }> {
    const where = stillClaimed(input.claimed);
    return await this.prisma.$transaction(async (tx) => {
      const current = await tx.researchFundDocument.findFirst({
        where,
        select: { maskedKey: true },
      });
      if (!current) return { recorded: false as const };
      const result = await tx.researchFundDocument.updateMany({
        where,
        data: {
          maskingStatus: "succeeded",
          maskedKey: input.maskedKey,
          maskedRegionCount: input.regionCount,
          maskingError: null,
        },
      });
      if (result.count !== 1) return { recorded: false as const };
      return { recorded: true as const, replacedKey: current.maskedKey };
    });
  }

  async fail(claimed: ClaimedMaskingDocument, error: string): Promise<void> {
    await this.prisma.researchFundDocument.updateMany({
      where: stillClaimed(claimed),
      data: { maskingStatus: "failed", maskingError: error, maskedRegionCount: null },
    });
  }

  async request(
    bookId: string,
    documentId: string,
  ): Promise<"requested" | "running" | "not-found"> {
    const where = { id: BigInt(documentId), bookId: BigInt(bookId) };
    const result = await this.prisma.researchFundDocument.updateMany({
      where: { ...where, maskingStatus: { not: "running" } },
      data: {
        maskingStatus: "pending",
        maskingStartedAt: null,
        maskingError: null,
        maskedRegionCount: null,
      },
    });
    if (result.count === 1) return "requested";
    const exists = await this.prisma.researchFundDocument.findFirst({
      where,
      select: { id: true },
    });
    return exists ? "running" : "not-found";
  }
}

/** 着手したときのまま running の書類（失効して別の実行が着手し直したものは含まない） */
function stillClaimed(claimed: ClaimedMaskingDocument) {
  return {
    id: BigInt(claimed.documentId),
    maskingStatus: "running" as const,
    maskingStartedAt: claimed.startedAt,
  };
}
