import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  ScanBatchView,
  ScanJobStatus,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type {
  CreateScanBatchInput,
  ScanRepository,
} from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

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
