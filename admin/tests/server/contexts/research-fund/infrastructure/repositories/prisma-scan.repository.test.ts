import type { PrismaClient } from "@prisma/client";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";

function setup() {
  const batch = { create: jest.fn(), findMany: jest.fn() };
  const document = { create: jest.fn() };
  const job = {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
  };
  const entry = { create: jest.fn(), findMany: jest.fn() };
  const account = { findMany: jest.fn() };
  const tx = {
    researchFundScanBatch: batch,
    researchFundDocument: document,
    researchFundScanJob: job,
    researchFundJournalEntry: entry,
    researchFundAccount: account,
  };
  const client = {
    ...tx,
    $transaction: jest.fn((run: (tx: unknown) => unknown) => run(tx)),
  };
  return {
    batch,
    document,
    job,
    entry,
    account,
    client,
    repository: new PrismaScanRepository(client as unknown as PrismaClient),
  };
}

const INPUT = {
  bookId: "12",
  uploadedById: "user-1",
  promptId: "7",
  model: "claude-sonnet-5",
  documents: [
    { storageKey: "key-1", mime: "image/jpeg", originalFilename: "IMG_1.jpg" },
    { storageKey: "key-2", mime: "application/pdf", originalFilename: "invoice.pdf" },
  ],
};

test("バッチ・書類・1書類1ジョブを1トランザクションで作る", async () => {
  const { batch, document, job, client, repository } = setup();
  batch.create.mockResolvedValue({ id: BigInt(99) });
  document.create
    .mockResolvedValueOnce({ id: BigInt(21) })
    .mockResolvedValueOnce({ id: BigInt(22) });
  await expect(repository.createBatch(INPUT)).resolves.toBe("99");
  expect(client.$transaction).toHaveBeenCalled();
  expect(batch.create).toHaveBeenCalledWith({
    data: { bookId: BigInt(12), uploadedById: "user-1" },
  });
  expect(document.create).toHaveBeenCalledTimes(2);
  expect(document.create).toHaveBeenNthCalledWith(1, {
    data: {
      bookId: BigInt(12),
      batchId: BigInt(99),
      storageKey: "key-1",
      mime: "image/jpeg",
      originalFilename: "IMG_1.jpg",
    },
  });
  // ジョブは queued（schema の既定値）で作り、使ったプロンプト版とモデルを記録する
  expect(job.create).toHaveBeenNthCalledWith(2, {
    data: {
      batchId: BigInt(99),
      documentId: BigInt(22),
      promptId: BigInt(7),
      model: "claude-sonnet-5",
    },
  });
});

test("バッチは新しい順、ジョブはアップロード順で返す", async () => {
  const { batch, repository } = setup();
  batch.findMany.mockResolvedValue([
    {
      id: BigInt(2),
      createdAt: new Date("2026-09-09T01:02:03.000Z"),
      jobs: [
        {
          id: BigInt(5),
          status: "queued",
          rawJson: null,
          error: null,
          document: { originalFilename: "IMG_1.jpg", mime: "image/jpeg" },
        },
      ],
    },
  ]);
  await expect(repository.listBatches("12")).resolves.toEqual([
    {
      id: "2",
      createdAt: "2026-09-09T01:02:03.000Z",
      jobs: [
        {
          id: "5",
          status: "queued",
          originalFilename: "IMG_1.jpg",
          mime: "image/jpeg",
          summary: null,
          error: null,
        },
      ],
    },
  ]);
  expect(batch.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { bookId: BigInt(12) }, orderBy: { id: "desc" } }),
  );
});

test.each([
  {
    name: "日付と先頭明細と件数",
    rawJson: {
      date: "2026-08-16",
      items: [
        { item: "グラス代", amount: 683 },
        { item: "皿", amount: 1200 },
      ],
    },
    expected: "2026.08.16・グラス代 ¥683 ほか1件",
  },
  { name: "読めない原文", rawJson: { items: [] }, expected: null },
  { name: "未読み取り", rawJson: null, expected: null },
  { name: "配列の原文", rawJson: [1, 2], expected: null },
])("抽出結果の要約は $name を扱う", async ({ rawJson, expected }) => {
  const { batch, repository } = setup();
  batch.findMany.mockResolvedValue([
    {
      id: BigInt(1),
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
      jobs: [
        {
          id: BigInt(1),
          status: "succeeded",
          rawJson,
          error: null,
          document: { originalFilename: "a.jpg", mime: "image/jpeg" },
        },
      ],
    },
  ]);
  const [result] = await repository.listBatches("12");
  expect(result.jobs[0].summary).toBe(expected);
});

const CLAIMED_ROW = {
  id: BigInt(11),
  document: {
    id: BigInt(42),
    storageKey: "key-1",
    mime: "image/jpeg",
    originalFilename: "IMG_1.jpg",
  },
  prompt: { body: "議員室プロンプト" },
};

test("帳簿の未処理ジョブを待機中・処理中に分けて数える", async () => {
  const { job, repository } = setup();
  job.groupBy.mockResolvedValue([
    { status: "queued", _count: { _all: 3 } },
    { status: "running", _count: { _all: 1 } },
  ]);
  await expect(repository.countUnfinished("12")).resolves.toEqual({ queued: 3, running: 1 });
  expect(job.groupBy).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { batch: { bookId: BigInt(12) }, status: { in: ["queued", "running"] } },
    }),
  );
});

test("1件も未処理がなければ0を返す", async () => {
  const { job, repository } = setup();
  job.groupBy.mockResolvedValue([]);
  await expect(repository.countUnfinished("12")).resolves.toEqual({ queued: 0, running: 0 });
});

test("待機中のジョブを古い順に処理中へ移し、読み取りに要る情報を返す", async () => {
  const { job, repository } = setup();
  job.findMany.mockResolvedValue([CLAIMED_ROW]);
  job.updateMany.mockResolvedValue({ count: 1 });
  await expect(repository.claimJobs("12", 2)).resolves.toEqual([
    {
      id: "11",
      documentId: "42",
      storageKey: "key-1",
      mime: "image/jpeg",
      originalFilename: "IMG_1.jpg",
      officePrompt: "議員室プロンプト",
    },
  ]);
  expect(job.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ orderBy: { id: "asc" }, take: 2 }),
  );
  // 他の実行に先を越されていないか、状態を条件に入れて更新する
  expect(job.updateMany).toHaveBeenCalledWith({
    where: { id: BigInt(11), status: "queued" },
    data: expect.objectContaining({ status: "running", error: null }),
  });
});

test("他の実行が先に掴んだジョブは返さない（多重実行の防止）", async () => {
  const { job, repository } = setup();
  job.findMany.mockResolvedValue([CLAIMED_ROW, { ...CLAIMED_ROW, id: BigInt(12) }]);
  job.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
  const claimed = await repository.claimJobs("12", 2);
  expect(claimed.map((entry) => entry.id)).toEqual(["12"]);
});

test("処理中のまま失効したジョブを待機中に戻す", async () => {
  const { job, repository } = setup();
  job.updateMany.mockResolvedValue({ count: 2 });
  const staleBefore = new Date("2026-09-12T09:00:00.000Z");
  await expect(repository.releaseStaleJobs("12", staleBefore)).resolves.toBe(2);
  expect(job.updateMany).toHaveBeenCalledWith({
    where: {
      batch: { bookId: BigInt(12) },
      status: "running",
      OR: [{ startedAt: null }, { startedAt: { lt: staleBefore } }],
    },
    data: { status: "queued", startedAt: null },
  });
});

const COMPLETE_INPUT = {
  bookId: "12",
  jobId: "11",
  documentId: "42",
  rawJson: { date: "2026-04-01" },
  userId: "user-1",
  entries: [
    {
      entryDate: "2026-04-01",
      description: "タクシー代",
      accountKey: "taxi",
      amount: 1200,
      note: null,
      splitGroup: null,
      hash: "hash-a",
      lines: [
        { side: "debit" as const, accountKey: "taxi", amount: 1200 },
        { side: "credit" as const, accountKey: "bank", amount: 1200 },
      ],
    },
  ],
};

test("下書き仕訳と原文JSONを保存してジョブを完了にする", async () => {
  const { entry, job, client, repository } = setup();
  entry.findMany.mockResolvedValue([]);
  await repository.completeJob(COMPLETE_INPUT);
  expect(client.$transaction).toHaveBeenCalled();
  expect(entry.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      bookId: BigInt(12),
      description: "タクシー代",
      status: "draft",
      source: "scan",
      documentId: BigInt(42),
      hash: "hash-a",
      createdById: "user-1",
      lines: { create: COMPLETE_INPUT.entries[0].lines },
    }),
  });
  expect(job.update).toHaveBeenCalledWith({
    where: { id: BigInt(11) },
    data: expect.objectContaining({ status: "succeeded", rawJson: { date: "2026-04-01" } }),
  });
});

test("同じhashの仕訳が既にあれば作り直さない（再処理で二重にしない）", async () => {
  const { entry, job, repository } = setup();
  entry.findMany.mockResolvedValue([{ hash: "hash-a" }]);
  await repository.completeJob(COMPLETE_INPUT);
  expect(entry.create).not.toHaveBeenCalled();
  // 仕訳を作らなくてもジョブ自体は完了させる
  expect(job.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: "succeeded" }) }),
  );
});

test("同じ抽出結果に同じhashの明細が並んでも1件しか作らない", async () => {
  const { entry, repository } = setup();
  entry.findMany.mockResolvedValue([]);
  await repository.completeJob({
    ...COMPLETE_INPUT,
    entries: [COMPLETE_INPUT.entries[0], { ...COMPLETE_INPUT.entries[0] }],
  });
  expect(entry.create).toHaveBeenCalledTimes(1);
});

test("ジョブを失敗にしてエラーを記録する", async () => {
  const { job, repository } = setup();
  await repository.failJob("11", "読み取りに失敗しました");
  expect(job.update).toHaveBeenCalledWith({
    where: { id: BigInt(11) },
    data: expect.objectContaining({ status: "failed", error: "読み取りに失敗しました" }),
  });
  // rawJson を渡さなければ既存の値を消さない
  expect(job.update.mock.calls[0][0].data).not.toHaveProperty("rawJson");
});

test("長すぎるエラーは切り詰めて保存する", async () => {
  const { job, repository } = setup();
  await repository.failJob("11", "あ".repeat(600));
  expect(job.update.mock.calls[0][0].data.error).toHaveLength(500);
});

test("失敗したジョブだけを待機中に戻す", async () => {
  const { job, repository } = setup();
  job.updateMany.mockResolvedValue({ count: 1 });
  await expect(repository.requeueJob("12", "11")).resolves.toBe(true);
  expect(job.updateMany).toHaveBeenCalledWith({
    where: { id: BigInt(11), batch: { bookId: BigInt(12) }, status: "failed" },
    data: { status: "queued", error: null, startedAt: null, finishedAt: null },
  });
});

test("他の帳簿や失敗していないジョブは戻せない", async () => {
  const { job, repository } = setup();
  job.updateMany.mockResolvedValue({ count: 0 });
  await expect(repository.requeueJob("12", "11")).resolves.toBe(false);
});

test("科目マスタをキーと種別だけにして返す", async () => {
  const { account, repository } = setup();
  account.findMany.mockResolvedValue([
    { key: "bank", type: "asset" },
    { key: "taxi", type: "expense" },
  ]);
  await expect(repository.accounts()).resolves.toEqual([
    { key: "bank", type: "asset" },
    { key: "taxi", type: "expense" },
  ]);
});
