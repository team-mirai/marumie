import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  ScanBatchView,
  ScanJobStatus,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import { inheritedAdvancedBy } from "@/server/contexts/research-fund/domain/models/advance";
import { ScanJobError } from "@/server/contexts/research-fund/domain/models/scan-job";
import type { RereadCandidate } from "@/server/contexts/research-fund/domain/models/scan-reread";
import type {
  ClaimedScanJob,
  CreateRereadBatchInput,
  CreateScanBatchInput,
  ScanRepository,
} from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import {
  inheritedPayeeLink,
  type Payee,
  type PayeeLink,
  rereadPayeeLink,
} from "@/server/contexts/research-fund/domain/models/payee";
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

  async createRereadBatch(input: CreateRereadBatchInput): Promise<string> {
    const bookId = BigInt(input.bookId);
    return await this.prisma.$transaction(async (tx) => {
      const batch = await tx.researchFundScanBatch.create({
        data: { bookId, uploadedById: input.uploadedById },
      });
      await tx.researchFundScanJob.createMany({
        data: input.documentIds.map((documentId) => ({
          batchId: batch.id,
          documentId: BigInt(documentId),
          promptId: BigInt(input.promptId),
          model: input.model,
          rereadInstruction: input.instruction,
        })),
      });
      return batch.id.toString();
    });
  }

  async findRereadCandidates(bookId: string, entryIds: string[]): Promise<RereadCandidate[]> {
    const selected = await this.prisma.researchFundJournalEntry.findMany({
      where: {
        bookId: BigInt(bookId),
        id: { in: entryIds.map((id) => BigInt(id)) },
        status: "draft",
        documentId: { not: null },
      },
      select: { documentId: true },
      distinct: ["documentId"],
      orderBy: { documentId: "asc" },
    });
    const documentIds = selected.flatMap((row) =>
      row.documentId === null ? [] : [row.documentId],
    );
    if (documentIds.length === 0) return [];
    const reviewed = await this.prisma.researchFundJournalEntry.findMany({
      where: {
        bookId: BigInt(bookId),
        documentId: { in: documentIds },
        status: { not: "draft" },
      },
      select: { documentId: true },
      distinct: ["documentId"],
    });
    const reviewedIds = new Set(reviewed.map((row) => row.documentId?.toString()));
    return documentIds.map((documentId) => ({
      documentId: documentId.toString(),
      hasReviewedEntries: reviewedIds.has(documentId.toString()),
    }));
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
        rereadInstruction: job.rereadInstruction,
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
    replaceDrafts: boolean;
    payeeId: string | null;
  }): Promise<void> {
    const bookId = BigInt(input.bookId);
    const documentId = BigInt(input.documentId);
    // 同じ抽出結果に同じ hash の明細が並んでも 1 件にする（先勝ち）。
    const entries = new Map<string, ScanDraftEntry>();
    for (const entry of input.entries) if (!entries.has(entry.hash)) entries.set(entry.hash, entry);
    await this.prisma.$transaction(async (tx) => {
      // 読み直しで引き継ぐ立替者。元の下書きの立替者が 1 種類だけなら作り直した下書きに付け直す
      // （立替は読み取れないので LLM の結果には含まれず、そのままでは入力済みの立替者が消える）。
      let advancedBy: string | null = null;
      // 読み直しで引き継ぐ支払先。元の下書きの支払先が 1 種類だけなら紐づけ元ごと付け直す
      let inheritedPayee: PayeeLink | null = null;
      if (input.replaceDrafts) {
        // 読み直しは書類単位で下書きを置き換える。確認済・公開中の仕訳がある書類は
        // （依頼の後に確認済にされた場合も）置き換えず、元の仕訳をそのまま残す。
        // 先に下書きを消して行ロックを取ってから数える。消した下書きを並行して確認済にする更新は
        // このトランザクションの終了まで待たされ、消す前に確認済になった分はここで数えられる。
        // 明細・支出群への所属は外部キーの cascade で一緒に消える（引き継がない）
        // 同じ書類の読み直しが並行して完了しても、書類の行ロックで直列化する。後続は先行の
        // 新しい下書きがコミットされてから消すので、両方の結果が並んで残らない
        await tx.$queryRaw`SELECT id FROM research_fund_documents WHERE id = ${documentId} FOR UPDATE`;
        // 立替者・支払先を読む前に下書きの行ロックも取る。書類のロックは立替者・支払先の更新
        // （setAdvancedBy などは書類を参照しない）を止めないので、ロック無しでは読んだ後・消す前に
        // コミットされた値を取りこぼし、作り直した下書きに古い立替者・支払先を付けてしまう。
        await tx.$queryRaw`
          SELECT id FROM research_fund_journal_entries
          WHERE book_id = ${bookId} AND document_id = ${documentId} AND status = 'draft'
          FOR UPDATE
        `;
        const replaced = await tx.researchFundJournalEntry.findMany({
          where: { bookId, documentId, status: "draft" },
          select: { advancedBy: true, payeeId: true, payeeLinkSource: true },
        });
        advancedBy = inheritedAdvancedBy(replaced.map((row) => row.advancedBy)).advancedBy;
        inheritedPayee = inheritedPayeeLink(
          replaced.map((row) => ({
            payeeId: row.payeeId === null ? null : row.payeeId.toString(),
            payeeLinkSource: row.payeeLinkSource,
          })),
        );
        await tx.researchFundJournalEntry.deleteMany({
          where: { bookId, documentId, status: "draft" },
        });
        const reviewed = await tx.researchFundJournalEntry.count({
          where: { bookId, documentId, status: { not: "draft" } },
        });
        // 投げるとトランザクションごと巻き戻り、消した下書きも元に戻る
        if (reviewed > 0)
          throw new ScanJobError(
            "確認済・公開中の仕訳があるため、読み直した結果で置き換えませんでした",
          );
      }
      // 読み直しでは、人が選んだ支払先の引き継ぎを発行元の照合より優先する（優先順位は rereadPayeeLink）
      const link = rereadPayeeLink(inheritedPayee, input.payeeId);
      // 紐づける支払先（照合の結果・引き継ぎとも）が帳簿と同じ議員のものかを同じトランザクションで確かめる
      // （DB の外部キーは支払先の存在しか見ないため。#1674）。違えば紐づけずに下書きを作る
      const payee =
        link !== null &&
        (await tx.researchFundPayee.count({
          where: { id: BigInt(link.payeeId), politician: { books: { some: { id: bookId } } } },
        })) === 1
          ? link
          : null;
      // 同じ書類を読み直しても仕訳を二重に作らない。hash は日付・金額・項目名・書類IDから作る。
      // (book_id, hash) の一意制約に任せて既存分は読み飛ばす（ON CONFLICT DO NOTHING）ので、
      // 同じ書類の処理が同時に走っても二重登録にならず、ジョブの完了も続行できる。
      const created = await tx.researchFundJournalEntry.createManyAndReturn({
        data: [...entries.values()].map((entry) => ({
          bookId,
          entryDate: new Date(`${entry.entryDate}T00:00:00.000Z`),
          description: entry.description,
          status: "draft",
          source: "scan",
          documentId,
          splitGroup: entry.splitGroup,
          note: entry.note,
          memo: entry.memo,
          advancedBy,
          payeeId: payee === null ? null : BigInt(payee.payeeId),
          payeeLinkSource: payee?.source ?? null,
          hash: entry.hash,
          createdById: input.userId,
        })),
        skipDuplicates: true,
        select: { id: true, hash: true },
      });
      // 明細は新しく作れた仕訳にだけ付ける。読み飛ばした既存の仕訳は明細ごと既にある。
      const lines = created.flatMap((row) =>
        (entries.get(row.hash)?.lines ?? []).map((line) => ({ ...line, entryId: row.id })),
      );
      if (lines.length > 0) await tx.researchFundJournalLine.createMany({ data: lines });
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

  async payees(bookId: string): Promise<Payee[]> {
    const rows = await this.prisma.researchFundPayee.findMany({
      where: { politician: { books: { some: { id: BigInt(bookId) } } } },
      orderBy: { id: "asc" },
    });
    return rows.map((row) => ({
      id: String(row.id),
      politicianId: String(row.politicianId),
      name: row.name,
      postalCode: row.postalCode,
      address: row.address,
      invoiceRegistrationNumber: row.invoiceRegistrationNumber,
    }));
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
