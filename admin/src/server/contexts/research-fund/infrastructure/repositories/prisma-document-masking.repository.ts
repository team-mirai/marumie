import "server-only";
import type { PrismaClient } from "@prisma/client";
import {
  DocumentMaskingPolicy,
  type DocumentMasking,
  type DocumentMaskingStatus,
  type StalledMaskingDestination,
} from "@/server/contexts/research-fund/domain/models/document-masking";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
  StalledMaskingDocument,
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
      error: DocumentMaskingPolicy.visibleError(row.maskingStatus, row.maskingError),
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

  async findStalled(staleBefore: Date): Promise<StalledMaskingDocument[]> {
    const rows = await this.prisma.researchFundDocument.findMany({
      where: {
        maskingStatus: "running",
        OR: [{ maskingStartedAt: null }, { maskingStartedAt: { lt: staleBefore } }],
      },
      orderBy: { id: "asc" },
      select: { id: true, maskingStartedAt: true, maskingError: true },
    });
    return rows.map((row) => ({
      documentId: row.id.toString(),
      startedAt: row.maskingStartedAt,
      error: row.maskingError,
    }));
  }

  async release(
    stalled: StalledMaskingDocument,
    destination: StalledMaskingDestination,
  ): Promise<boolean> {
    // 見つけた後に作成が終わっていたら（running でない・着手し直した）count は 0 になり、記録を上書きしない
    const result = await this.prisma.researchFundDocument.updateMany({
      where: {
        id: BigInt(stalled.documentId),
        maskingStatus: "running",
        maskingStartedAt: stalled.startedAt,
      },
      data: {
        maskingStatus: destination.status,
        maskingStartedAt: null,
        maskingError: destination.error,
        maskedRegionCount: null,
      },
    });
    return result.count === 1;
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
      // masking_error（作り直しの印）は残し、また止まったときに失敗にできるようにする。
      // 候補を読んだ後に原本が差し替えられていたら（#1827）、前の原本で作らないよう着手しない
      const result = await this.prisma.researchFundDocument.updateMany({
        where: { id: document.id, storageKey: document.storageKey, maskingStatus: "pending" },
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
    requestable: readonly DocumentMaskingStatus[],
  ): Promise<{ requested: true } | { requested: false; status: DocumentMaskingStatus } | null> {
    const where = { id: BigInt(documentId), bookId: BigInt(bookId) };
    // 状態の条件を更新と同じ文で確かめ、同時に着手された書類を pending に戻さない
    const result = await this.prisma.researchFundDocument.updateMany({
      where: { ...where, maskingStatus: { in: [...requestable] } },
      data: {
        maskingStatus: "pending",
        maskingStartedAt: null,
        maskingError: null,
        maskedRegionCount: null,
        maskingInstruction: instruction,
      },
    });
    if (result.count === 1) return { requested: true };
    const current = await this.prisma.researchFundDocument.findFirst({
      where,
      select: { maskingStatus: true },
    });
    return current ? { requested: false, status: current.maskingStatus } : null;
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
