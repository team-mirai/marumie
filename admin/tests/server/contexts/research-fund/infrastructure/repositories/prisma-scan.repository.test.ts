import type { PrismaClient } from "@prisma/client";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";

function setup() {
  const batch = { create: jest.fn(), findMany: jest.fn() };
  const document = { create: jest.fn() };
  const job = { create: jest.fn() };
  const tx = {
    researchFundScanBatch: batch,
    researchFundDocument: document,
    researchFundScanJob: job,
  };
  const client = {
    ...tx,
    $transaction: jest.fn((run: (tx: unknown) => unknown) => run(tx)),
  };
  return {
    batch,
    document,
    job,
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
