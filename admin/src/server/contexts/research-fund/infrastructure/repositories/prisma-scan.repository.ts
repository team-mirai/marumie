import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ScanBatchView,
  ScanJobStatus,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type {
  ClaimedScanJob,
  CreateScanBatchInput,
  ScanRepository,
} from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";
import type { ScanDraftEntry } from "@/server/contexts/research-fund/domain/services/scan-journal-builder";

export class PrismaScanRepository implements ScanRepository {
  constructor(private prisma: PrismaClient) {}

  async createBatch(input: CreateScanBatchInput): Promise<string> {
    const bookId = BigInt(input.bookId);
    return await this.prisma.$transaction(async (tx) => {
      const batch = await tx.researchFundScanBatch.create({
        data: { bookId, uploadedById: input.uploadedById },
      });
      // 1書類=1ジョブ。使ったプロンプト版とモデルをジョブに記録する
      for (const document of input.documents) {
        const created = await tx.researchFundDocument.create({
          data: {
            bookId,
            batchId: batch.id,
            storageKey: document.storageKey,
            mime: document.mime,
            originalFilename: document.originalFilename,
          },
        });
        await tx.researchFundScanJob.create({
          data: {
            batchId: batch.id,
            documentId: created.id,
            promptId: BigInt(input.promptId),
            model: input.model,
          },
        });
      }
      return batch.id.toString();
    });
  }

  async listBatches(bookId: string): Promise<ScanBatchView[]> {
    const rows = await this.prisma.researchFundScanBatch.findMany({
      where: { bookId: BigInt(bookId) },
      orderBy: { id: "desc" },
      include: {
        jobs: {
          orderBy: { id: "asc" },
          include: {
            document: { select: { originalFilename: true, mime: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id.toString(),
      createdAt: row.createdAt.toISOString(),
      jobs: row.jobs.map((job) => ({
        id: job.id.toString(),
        status: job.status as ScanJobStatus,
        originalFilename: job.document.originalFilename,
        mime: job.document.mime,
        summary: summarizeRawJson(job.rawJson),
        error: job.error,
      })),
    }));
  }

  async countUnfinished(bookId: string): Promise<{ queued: number; running: number }> {
    const rows = await this.prisma.researchFundScanJob.groupBy({
      by: ["status"],
      where: { batch: { bookId: BigInt(bookId) }, status: { in: ["queued", "running"] } },
      _count: { _all: true },
    });
    const count = (status: "queued" | "running") =>
      rows.find((row) => row.status === status)?._count._all ?? 0;
    return { queued: count("queued"), running: count("running") };
  }

  async claimJobs(bookId: string, limit: number): Promise<ClaimedScanJob[]> {
    const candidates = await this.prisma.researchFundScanJob.findMany({
      where: { batch: { bookId: BigInt(bookId) }, status: "queued" },
      orderBy: { id: "asc" },
      take: limit,
      include: {
        document: { select: { id: true, storageKey: true, mime: true, originalFilename: true } },
        prompt: { select: { body: true } },
      },
    });
    const claimed: ClaimedScanJob[] = [];
    for (const job of candidates) {
      // 同時に走った別の実行が先に掴んでいたら count は 0 になる。その分は諦めて次へ。
      const result = await this.prisma.researchFundScanJob.updateMany({
        where: { id: job.id, status: "queued" },
        data: { status: "running", startedAt: new Date(), error: null },
      });
      if (result.count !== 1) continue;
      claimed.push({
        id: job.id.toString(),
        documentId: job.document.id.toString(),
        storageKey: job.document.storageKey,
        mime: job.document.mime,
        originalFilename: job.document.originalFilename,
        officePrompt: job.prompt.body,
      });
    }
    return claimed;
  }

  async releaseStaleJobs(bookId: string, staleBefore: Date): Promise<number> {
    const result = await this.prisma.researchFundScanJob.updateMany({
      where: {
        batch: { bookId: BigInt(bookId) },
        status: "running",
        OR: [{ startedAt: null }, { startedAt: { lt: staleBefore } }],
      },
      data: { status: "queued", startedAt: null },
    });
    return result.count;
  }

  async completeJob(input: {
    bookId: string;
    jobId: string;
    documentId: string;
    rawJson: unknown;
    entries: ScanDraftEntry[];
    userId: string;
  }): Promise<void> {
    const bookId = BigInt(input.bookId);
    await this.prisma.$transaction(async (tx) => {
      // 同じ書類を読み直しても仕訳を二重に作らない。hash は日付・金額・項目名・書類IDから作る。
      const existing = await tx.researchFundJournalEntry.findMany({
        where: { bookId, hash: { in: input.entries.map((entry) => entry.hash) } },
        select: { hash: true },
      });
      const known = new Set(existing.map((entry) => entry.hash));
      for (const entry of input.entries) {
        if (known.has(entry.hash)) continue;
        known.add(entry.hash);
        await tx.researchFundJournalEntry.create({
          data: {
            bookId,
            entryDate: new Date(`${entry.entryDate}T00:00:00.000Z`),
            description: entry.description,
            status: "draft",
            source: "scan",
            documentId: BigInt(input.documentId),
            splitGroup: entry.splitGroup,
            note: entry.note,
            hash: entry.hash,
            createdById: input.userId,
            lines: { create: entry.lines.map((line) => ({ ...line })) },
          },
        });
      }
      await tx.researchFundScanJob.update({
        where: { id: BigInt(input.jobId) },
        data: {
          status: "succeeded",
          rawJson: input.rawJson as Prisma.InputJsonValue,
          error: null,
          finishedAt: new Date(),
        },
      });
    });
  }

  async failJob(jobId: string, error: string, rawJson?: unknown): Promise<void> {
    await this.prisma.researchFundScanJob.update({
      where: { id: BigInt(jobId) },
      data: {
        status: "failed",
        error: error.slice(0, 500),
        finishedAt: new Date(),
        ...(rawJson === undefined ? {} : { rawJson: rawJson as Prisma.InputJsonValue }),
      },
    });
  }

  async requeueJob(bookId: string, jobId: string): Promise<boolean> {
    const result = await this.prisma.researchFundScanJob.updateMany({
      where: { id: BigInt(jobId), batch: { bookId: BigInt(bookId) }, status: "failed" },
      data: { status: "queued", error: null, startedAt: null, finishedAt: null },
    });
    return result.count === 1;
  }

  async accounts(): Promise<ResearchFundAccount[]> {
    const rows = await this.prisma.researchFundAccount.findMany({
      select: { key: true, type: true },
      orderBy: { displayOrder: "asc" },
    });
    return rows.map((row) => ({ key: row.key, type: row.type }));
  }
}

/**
 * 抽出結果の要約列に出す 1 行。読み取りは #1365 で実装するので、いまは保存済みの原文 JSON
 * （`{ date, items: [{ item, amount }] }`）から表示できる範囲だけを拾い、読めなければ null を返す。
 */
function summarizeRawJson(rawJson: unknown): string | null {
  if (!isRecord(rawJson)) return null;
  const items = Array.isArray(rawJson.items) ? rawJson.items.filter(isRecord) : [];
  const head = items[0];
  if (!head) return null;
  const item = typeof head.item === "string" ? head.item : "明細";
  const amount = typeof head.amount === "number" ? `¥${head.amount.toLocaleString("ja-JP")}` : "";
  const rest = items.length > 1 ? ` ほか${items.length - 1}件` : "";
  const date = typeof rawJson.date === "string" ? `${rawJson.date.replaceAll("-", ".")}・` : "";
  return `${date}${item}${amount ? ` ${amount}` : ""}${rest}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
