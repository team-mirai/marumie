import { CreateScanBatchUsecase } from "@/server/contexts/research-fund/application/usecases/create-scan-batch-usecase";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { DocumentUploadStorage } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

const ACTIVE_PROMPT = {
  id: "7",
  version: 3,
  body: "本文",
  isActive: true,
  updatedAt: "2026-09-01T00:00:00.000Z",
  jobCount: 0,
};
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const PDF = new TextEncoder().encode("%PDF-1.4\n");
const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";

describe("CreateScanBatchUsecase", () => {
  const scanRepository: jest.Mocked<ScanRepository> = {
    createBatch: jest.fn(),
    createRereadBatch: jest.fn(),
    findRereadCandidates: jest.fn(),
    listBatches: jest.fn(),
    countUnfinished: jest.fn(),
    claimJobs: jest.fn(),
    releaseStaleJobs: jest.fn(),
    completeJob: jest.fn(),
    failJob: jest.fn(),
    requeueJob: jest.fn(),
    accounts: jest.fn(),
    payees: jest.fn(),
  };
  const promptRepository: jest.Mocked<PromptRepository> = {
    list: jest.fn(),
    create: jest.fn(),
    activate: jest.fn(),
    findActive: jest.fn(),
  };
  const storage: jest.Mocked<DocumentStorage & DocumentUploadStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
    createUploadTarget: jest.fn(),
    claimUpload: jest.fn(),
  };
  const usecase = new CreateScanBatchUsecase(
    scanRepository,
    promptRepository,
    storage,
    "claude-sonnet-5",
  );
  const input = {
    politicianId: "5",
    bookId: "12",
    userId: "user-1",
    documents: [
      { uploadKey: `uploads/5/user-1/${UUID_1}`, originalFilename: "IMG_1.jpg" },
      { uploadKey: `uploads/5/user-1/${UUID_2}`, originalFilename: "invoice.pdf" },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    promptRepository.findActive.mockResolvedValue(ACTIVE_PROMPT);
    storage.claimUpload
      .mockResolvedValueOnce({ status: "valid", value: "key-1" })
      .mockResolvedValueOnce({ status: "valid", value: "key-2" });
    storage.download.mockImplementation(async (key) => ({
      status: "valid",
      value: key === "key-1" ? JPEG : PDF,
    }));
    scanRepository.createBatch.mockResolvedValue("99");
  });

  it("claims every upload and records the detected format and the active prompt version", async () => {
    expect(await usecase.execute(input)).toEqual({
      status: "valid",
      value: { batchId: "99" },
    });
    expect(storage.claimUpload).toHaveBeenNthCalledWith(1, input.documents[0].uploadKey);
    expect(storage.claimUpload).toHaveBeenNthCalledWith(2, input.documents[1].uploadKey);
    expect(scanRepository.createBatch).toHaveBeenCalledWith({
      bookId: "12",
      uploadedById: "user-1",
      promptId: "7",
      model: "claude-sonnet-5",
      documents: [
        { storageKey: "key-1", mime: "image/jpeg", originalFilename: "IMG_1.jpg" },
        { storageKey: "key-2", mime: "application/pdf", originalFilename: "invoice.pdf" },
      ],
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it.each([
    { name: "too many documents", documents: Array.from({ length: 31 }, () => input.documents[0]) },
    { name: "no documents", documents: [] },
    {
      name: "an original already registered (not an upload key)",
      documents: [{ uploadKey: UUID_1, originalFilename: "a.jpg" }],
    },
    {
      name: "an upload key issued to another user",
      documents: [{ uploadKey: `uploads/5/user-2/${UUID_1}`, originalFilename: "a.jpg" }],
    },
    {
      name: "an upload key issued for another politician",
      documents: [{ uploadKey: `uploads/6/user-1/${UUID_1}`, originalFilename: "a.jpg" }],
    },
    {
      name: "a path escaping the upload prefix",
      documents: [{ uploadKey: `uploads/5/user-1/../../${UUID_1}`, originalFilename: "a.jpg" }],
    },
    {
      name: "a blank filename",
      documents: [{ uploadKey: input.documents[0].uploadKey, originalFilename: " " }],
    },
  ])("rejects $name before touching storage", async ({ documents }) => {
    expect(await usecase.execute({ ...input, documents })).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT" }],
    });
    expect(storage.claimUpload).not.toHaveBeenCalled();
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("rejects an invalid book id before touching storage", async () => {
    expect(await usecase.execute({ ...input, bookId: "../12" })).toMatchObject({
      status: "invalid",
    });
    expect(storage.claimUpload).not.toHaveBeenCalled();
  });

  it("refuses to create jobs while no prompt version is active", async () => {
    promptRepository.findActive.mockResolvedValue(null);
    await expect(usecase.execute(input)).rejects.toThrow("読み取りプロンプトが未保存です");
    expect(storage.claimUpload).not.toHaveBeenCalled();
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("does not trust the browser: a file whose content is not JPEG/PNG/PDF is removed and rejected", async () => {
    storage.download.mockImplementation(async (key) => ({
      status: "valid",
      value: key === "key-1" ? JPEG : new TextEncoder().encode("<svg/>"),
    }));
    expect(await usecase.execute(input)).toMatchObject({
      status: "invalid",
      errors: [{ message: expect.stringContaining("ファイルの中身が対応する形式ではありません") }],
    });
    expect(storage.remove).toHaveBeenCalledWith("key-2");
    expect(storage.remove).toHaveBeenCalledWith("key-1");
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit after checking the stored bytes", async () => {
    const huge = new Uint8Array(20 * 1024 * 1024 + 1);
    huge.set(PDF);
    storage.download.mockImplementation(async (key) => ({
      status: "valid",
      value: key === "key-1" ? JPEG : huge,
    }));
    expect(await usecase.execute(input)).toMatchObject({
      status: "invalid",
      errors: [{ message: "1ファイル20MBまでです" }],
    });
    expect(storage.remove).toHaveBeenCalledWith("key-2");
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("rejects an upload that was never placed, removing the ones already claimed", async () => {
    storage.claimUpload.mockReset();
    storage.claimUpload
      .mockResolvedValueOnce({ status: "valid", value: "key-1" })
      .mockResolvedValueOnce({
        status: "invalid",
        errors: [
          {
            path: "document",
            code: "RF_INVALID_DOCUMENT",
            message: "アップロードした書類が見つかりませんでした",
            severity: "error",
          },
        ],
      });
    expect(await usecase.execute(input)).toMatchObject({ status: "invalid" });
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith("key-1");
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("removes already claimed originals when the batch cannot be saved", async () => {
    scanRepository.createBatch.mockRejectedValue(new Error("database failed"));
    await expect(usecase.execute(input)).rejects.toThrow("database failed");
    expect(storage.remove).toHaveBeenCalledWith("key-1");
    expect(storage.remove).toHaveBeenCalledWith("key-2");
  });

  it("removes already claimed originals when a later claim fails", async () => {
    storage.claimUpload.mockReset();
    storage.claimUpload
      .mockResolvedValueOnce({ status: "valid", value: "key-1" })
      .mockRejectedValueOnce(new Error("storage failed"));
    await expect(usecase.execute(input)).rejects.toThrow("storage failed");
    expect(storage.remove).toHaveBeenCalledWith("key-1");
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("does not remove an original twice when the invalid-upload cleanup fails", async () => {
    storage.claimUpload.mockReset();
    storage.claimUpload
      .mockResolvedValueOnce({ status: "valid", value: "key-1" })
      .mockResolvedValueOnce({
        status: "invalid",
        errors: [
          {
            path: "document",
            code: "RF_INVALID_DOCUMENT",
            message: "見つかりません",
            severity: "error",
          },
        ],
      });
    storage.remove.mockRejectedValue(new Error("cleanup failed"));
    await expect(usecase.execute(input)).rejects.toBeInstanceOf(AggregateError);
    expect(storage.remove).toHaveBeenCalledTimes(1);
    expect(storage.remove).toHaveBeenCalledWith("key-1");
    expect(scanRepository.createBatch).not.toHaveBeenCalled();
  });

  it("preserves both errors when cleanup also fails", async () => {
    const database = new Error("database failed");
    const cleanup = new Error("cleanup failed");
    scanRepository.createBatch.mockRejectedValue(database);
    storage.remove.mockRejectedValue(cleanup);
    await expect(usecase.execute(input)).rejects.toMatchObject({
      errors: [database, cleanup, cleanup],
    });
  });
});
