import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import type { CreateScanBatchUsecase } from "@/server/contexts/research-fund/application/usecases/create-scan-batch-usecase";
import { ScanBatchError } from "@/server/contexts/research-fund/domain/models/scan-batch";
import { createScanBatch } from "@/server/contexts/research-fund/presentation/actions/create-scan-batch";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { notifyDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";
import { buildCreateScanBatchUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({
  requireResearchFundWriter: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-document-masking", () => ({
  notifyDocumentMasking: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-scan", () => ({
  buildCreateScanBatchUsecase: jest.fn(),
}));

const createBatch = jest.fn();

function jpeg(name: string) {
  return { uploadKey: `uploads/2/user/${name}`, originalFilename: name };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(requireResearchFundWriter)
    .mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireResearchFundWriter>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({
    kind: "research-fund",
    key: "book:1",
    name: "議員",
    year: 2026,
    politicianId: "2",
    bookId: "1",
    draftCount: 0,
  });
  jest
    .mocked(buildCreateScanBatchUsecase)
    .mockReturnValue({ execute: createBatch } as unknown as CreateScanBatchUsecase);
  createBatch.mockResolvedValue({ status: "valid", value: { batchId: "9" } });
});

test("ブラウザが置いた書類のキーを usecase に渡し、公開用の版の作成を依頼してレイアウトを再検証する", async () => {
  await expect(createScanBatch("2", "1", [jpeg("IMG_1.jpg"), jpeg("IMG_2.jpg")])).resolves.toEqual({
    success: true,
    batchId: "9",
    count: 2,
  });
  expect(createBatch).toHaveBeenCalledWith({
    politicianId: "2",
    bookId: "1",
    userId: "user",
    documents: [jpeg("IMG_1.jpg"), jpeg("IMG_2.jpg")],
  });
  expect(notifyDocumentMasking).toHaveBeenCalledTimes(1);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});

test("31枚以上はサーバー側でも弾き、保存を始めない", async () => {
  const files = Array.from({ length: 31 }, (_, index) => jpeg(`IMG_${index}.jpg`));
  await expect(createScanBatch("2", "1", files)).resolves.toEqual({
    success: false,
    error: "1回にアップロードできるのは30枚までです",
  });
  expect(createBatch).not.toHaveBeenCalled();
  expect(notifyDocumentMasking).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("ファイルが無ければ保存を始めない", async () => {
  await expect(createScanBatch("2", "1", [])).resolves.toEqual({
    success: false,
    error: "書類を1枚以上選んでください",
  });
  expect(createBatch).not.toHaveBeenCalled();
});

test("別の対象への古いフォーム送信を拒否", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  await expect(createScanBatch("2", "1", [jpeg("a.jpg")])).resolves.toMatchObject({
    success: false,
  });
  expect(createBatch).not.toHaveBeenCalled();
});

test("認証失敗時はアップロードしない", async () => {
  jest.mocked(requireResearchFundWriter).mockRejectedValueOnce(new Error("auth"));
  await expect(createScanBatch("2", "1", [jpeg("a.jpg")])).rejects.toThrow("auth");
  expect(createBatch).not.toHaveBeenCalled();
});

test("対応外の形式は usecase の検証結果をそのまま伝える", async () => {
  createBatch.mockResolvedValue({
    status: "invalid",
    errors: [
      {
        path: "documents",
        code: "RF_INVALID_DOCUMENT",
        message: "JPG・PNG・PDFのみアップロードできます",
        severity: "error",
      },
    ],
  });
  await expect(createScanBatch("2", "1", [jpeg("a.jpg")])).resolves.toEqual({
    success: false,
    error: "JPG・PNG・PDFのみアップロードできます",
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("利用者が直せる事情は伝え、内部エラーは漏らさない", async () => {
  createBatch.mockRejectedValueOnce(new ScanBatchError("読み取りプロンプトが未保存です"));
  await expect(createScanBatch("2", "1", [jpeg("a.jpg")])).resolves.toEqual({
    success: false,
    error: "読み取りプロンプトが未保存です",
  });
  createBatch.mockRejectedValueOnce(new Error("private storage detail"));
  await expect(createScanBatch("2", "1", [jpeg("a.jpg")])).resolves.toEqual({
    success: false,
    error: "書類のアップロードに失敗しました。時間をおいて再度お試しください",
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});
