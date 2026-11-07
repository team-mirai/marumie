import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
} from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

/** 着手を試す候補の数。キューから並んで届いた処理が同じ書類を取り合っても、別の書類に着手できるようにする */
const CLAIM_CANDIDATES = 5;

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
        maskingInstruction: true,
      },
      orderBy: { id: "asc" },
    });
    return rows.map((row) => ({
      documentId: row.id.toString(),
      status: row.maskingStatus,
      // pending / running の masking_error は作り直しの印なので、画面には失敗のときだけ出す
      error: row.maskingStatus === "failed" ? row.maskingError : null,
      regionCount: row.maskedRegionCount,
      hasMaskedVersion: row.maskedKey !== null,
      instruction: row.maskingInstruction,
    }));
  }

  async countUnfinished(): Promise<{ pending: number; running: number }> {
    const rows = await this.prisma.researchFundDocument.groupBy({
      by: ["maskingStatus"],
      where: { maskingStatus: { in: ["pending", "running"] } },
      _count: { _all: true },
    });
    const count = (status: "pending" | "running") =>
      rows.find((row) => row.maskingStatus === status)?._count._all ?? 0;
    return { pending: count("pending"), running: count("running") };
  }

  async releaseStale(
    staleBefore: Date,
    outcome: { retryNote: string; failure: string },
  ): Promise<{ retried: number; failed: number }> {
    const stale = {
      maskingStatus: "running" as const,
      OR: [{ maskingStartedAt: null }, { maskingStartedAt: { lt: staleBefore } }],
    };
    return await this.prisma.$transaction(async (tx) => {
      // 作り直しても止まったもの（印が残っている）を先に失敗にし、そのあと初めて止まったものに印を付けて戻す
      const failed = await tx.researchFundDocument.updateMany({
        where: { ...stale, maskingError: { not: null } },
        data: { maskingStatus: "failed", maskingError: outcome.failure, maskedRegionCount: null },
      });
      const retried = await tx.researchFundDocument.updateMany({
        where: { ...stale, maskingError: null },
        data: { maskingStatus: "pending", maskingStartedAt: null, maskingError: outcome.retryNote },
      });
      return { retried: retried.count, failed: failed.count };
    });
  }

  async claimNext(): Promise<ClaimedMaskingDocument | null> {
    const candidates = await this.prisma.researchFundDocument.findMany({
      where: { maskingStatus: "pending" },
      orderBy: { id: "asc" },
      take: CLAIM_CANDIDATES,
      select: { id: true, storageKey: true, mime: true, maskingInstruction: true },
    });
    for (const document of candidates) {
      const startedAt = new Date();
      // 同時に走った別の実行が先に着手していたら count は 0 になる。その書類は諦めて次へ。
      // masking_error（作り直しの印）は残し、また止まったときに失敗にできるようにする
      const result = await this.prisma.researchFundDocument.updateMany({
        where: { id: document.id, maskingStatus: "pending" },
        data: { maskingStatus: "running", maskingStartedAt: startedAt },
      });
      if (result.count !== 1) continue;
      return {
        documentId: document.id.toString(),
        storageKey: document.storageKey,
        mime: document.mime,
        instruction: document.maskingInstruction,
        startedAt,
      };
    }
    return null;
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
    instruction: string | null,
  ): Promise<"requested" | "running" | "not-found"> {
    const where = { id: BigInt(documentId), bookId: BigInt(bookId) };
    const result = await this.prisma.researchFundDocument.updateMany({
      where: { ...where, maskingStatus: { not: "running" } },
      data: {
        maskingStatus: "pending",
        maskingStartedAt: null,
        maskingError: null,
        maskedRegionCount: null,
        maskingInstruction: instruction,
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
