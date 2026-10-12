import { config } from "dotenv";
import { readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// .env.local から環境変数（DATABASE_URL・ANTHROPIC_API_KEY）を読み込む（admin ディレクトリから実行される前提）
config({ path: join(process.cwd(), ".env.local") });

import { PrismaClient } from "@prisma/client";
import { ProcessScanJobsUsecase } from "@/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import { DEFAULT_OFFICE_PROMPT } from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";
import {
  researchFundExtractionModel,
  VercelAIReceiptExtractionGateway,
} from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-receipt-extraction-gateway";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";

/**
 * 書類スキャンで支払先を新しく登録し、2 枚目以降はそれに紐づくことを、実際の DB・実際の LLM API・
 * 実際の領収書の画像（黒塗り済み。#1721）で確かめる。LLM も読み取り結果もモックしない。
 *
 * 明示的に有効にしたときだけ動く（ローカルの supabase と ANTHROPIC_API_KEY が要る）:
 *   pnpm supabase:start && pnpm db:reset
 *   pnpm test:integration
 */
const describeIntegration = process.env.INTEGRATION_TEST === "true" ? describe : describe.skip;

const RECEIPT_DIR = join(process.cwd(), "tests/data/research-fund");

/** Storage の代わりに、storageKey をファイル名としてリポジトリの画像をそのまま返す */
const fileStorage: DocumentStorage = {
  async upload() {
    throw new Error("not used");
  },
  async download(storageKey) {
    return { status: "valid", value: new Uint8Array(await readFile(join(RECEIPT_DIR, storageKey))) };
  },
  async createSignedUrl() {
    throw new Error("not used");
  },
  async remove() {},
};

describeIntegration("ProcessScanJobsUsecase（実際の領収書と LLM API）", () => {
  const prisma = new PrismaClient();
  const repository = new PrismaScanRepository(prisma);
  const usecase = new ProcessScanJobsUsecase(
    repository,
    fileStorage,
    new VercelAIReceiptExtractionGateway(),
  );
  const suffix = randomUUID();
  let userId: string;
  let politicianId: bigint;
  let bookId: string;
  let promptId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { authId: suffix, email: `scan-integration-${suffix}@example.com` },
    });
    userId = user.id;
    // 支払先が空の議員
    const politician = await prisma.politician.create({
      data: { name: "スキャン検証", slug: `scan-integration-${suffix}`, termStart: new Date("2026-02-08") },
    });
    politicianId = politician.id;
    const book = await prisma.researchFundBook.create({
      data: { politicianId, financialYear: 2026 },
    });
    bookId = String(book.id);
    const prompt = await prisma.researchFundPrompt.create({
      data: { politicianId, version: 1, body: DEFAULT_OFFICE_PROMPT, isActive: true },
    });
    promptId = String(prompt.id);
  });

  afterAll(async () => {
    // ジョブがプロンプトを参照しているので、帳簿（書類・ジョブ・仕訳ごと cascade で消える）を先に消す。
    // 支払先・プロンプトは議員の削除で cascade に消える
    if (bookId !== undefined) await prisma.researchFundBook.delete({ where: { id: BigInt(bookId) } });
    if (politicianId !== undefined) await prisma.politician.delete({ where: { id: politicianId } });
    if (userId !== undefined) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  /** 1 枚の領収書をアップロードしたバッチを作り、ジョブが残らなくなるまで処理する。書類 ID を返す */
  async function scan(filename: string): Promise<bigint> {
    const batchId = await repository.createBatch({
      bookId,
      uploadedById: userId,
      promptId,
      model: researchFundExtractionModel(),
      documents: [{ storageKey: filename, mime: "image/png", originalFilename: filename }],
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await usecase.execute({ bookId, userId });
      if (!result.hasMore) break;
    }
    const job = await prisma.researchFundScanJob.findFirstOrThrow({
      where: { batchId: BigInt(batchId) },
    });
    // 失敗したら原因（と読み取りの原文）が分かるように出す
    expect({ status: job.status, error: job.error }).toEqual({ status: "succeeded", error: null });
    return job.documentId;
  }

  async function payees() {
    return await prisma.researchFundPayee.findMany({ where: { politicianId } });
  }

  async function entriesOf(documentId: bigint) {
    return await prisma.researchFundJournalEntry.findMany({
      where: { bookId: BigInt(bookId), documentId },
      select: { payeeId: true, payeeLinkSource: true },
    });
  }

  it("1 枚目の Amazon の領収書で Amazon の支払先が 1 件登録され、仕訳に紐づく", async () => {
    const documentId = await scan("amazon-receipt-01.png");

    const registered = await payees();
    expect(registered).toHaveLength(1);
    // 出品者（AnkerDirect）ではなく Amazon を支払先にする
    expect(registered[0].name).toMatch(/Amazon|アマゾン/i);
    const entries = await entriesOf(documentId);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries)
      expect(entry).toEqual({ payeeId: registered[0].id, payeeLinkSource: "ai" });
    // 発行元の名称が、登録した支払先の表記として記録される
    const aliases = await prisma.researchFundPayeeAlias.findMany({ where: { payeeId: registered[0].id } });
    expect(aliases).toEqual([
      expect.objectContaining({ name: registered[0].name, source: "ai", documentId }),
    ]);
  }, 180_000);

  it("続けて 2 枚目の Amazon の領収書を処理すると、支払先は増えず 1 枚目で登録した支払先に紐づく", async () => {
    const [first] = await payees();
    const documentId = await scan("amazon-receipt-02.png");

    expect(await payees()).toHaveLength(1);
    const entries = await entriesOf(documentId);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry).toEqual({ payeeId: first.id, payeeLinkSource: "rule" });
  }, 180_000);

  it("支払先の名称を直したあとでも、同じ表記の領収書は新しい支払先を作らず名称を直した支払先に紐づく", async () => {
    const [first] = await payees();
    // ステージングで起きた手順の再現: 「Amazon.co.jp」を AI 検索で正式名称に直した。
    // インボイス登録番号の一致ではなく表記の一致で紐づくことを確かめるため、番号も外す
    await prisma.researchFundPayee.update({
      where: { id: first.id },
      data: { name: "アマゾンジャパン合同会社", invoiceRegistrationNumber: null },
    });
    const documentId = await scan("amazon-receipt-01.png");

    expect(await payees()).toHaveLength(1);
    const entries = await entriesOf(documentId);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry).toEqual({ payeeId: first.id, payeeLinkSource: "rule" });
  }, 180_000);
});
