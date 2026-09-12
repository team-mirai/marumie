import { ManageScanUsecase } from "@/server/contexts/research-fund/application/usecases/manage-scan-usecase";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
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

describe("ManageScanUsecase", () => {
  const scanRepository: jest.Mocked<ScanRepository> = {
    createBatch: jest.fn(),
    listBatches: jest.fn(),
  };
  const promptRepository: jest.Mocked<PromptRepository> = {
    list: jest.fn(),
    create: jest.fn(),
    activate: jest.fn(),
    findActive: jest.fn(),
  };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const usecase = new ManageScanUsecase(
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
      { bytes: new Uint8Array([1]), mime: "image/jpeg", originalFilename: "IMG_1.jpg" },
      { bytes: new Uint8Array([2]), mime: "application/pdf", originalFilename: "invoice.pdf" },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    promptRepository.findActive.mockResolvedValue(ACTIVE_PROMPT);
    storage.upload
      .mockResolvedValueOnce({ status: "valid", value: "key-1" })
      .mockResolvedValueOnce({ status: "valid", value: "key-2" });
    scanRepository.createBatch.mockResolvedValue("99");
  });

  describe("createBatch", () => {
    it("uploads every document and records the active prompt version on each queued job", async () => {
      expect(await usecase.createBatch(input)).toEqual({
        status: "valid",
        value: { batchId: "99" },
      });
      expect(storage.upload).toHaveBeenCalledTimes(2);
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
        name: "an unsupported format",
        documents: [{ bytes: new Uint8Array([1]), mime: "image/gif", originalFilename: "a.gif" }],
      },
      {
        name: "an empty file",
        documents: [{ bytes: new Uint8Array(), mime: "image/jpeg", originalFilename: "a.jpg" }],
      },
      {
        name: "a blank filename",
        documents: [{ bytes: new Uint8Array([1]), mime: "image/jpeg", originalFilename: " " }],
      },
    ])("rejects $name before touching storage", async ({ documents }) => {
      expect(await usecase.createBatch({ ...input, documents })).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_INVALID_DOCUMENT" }],
      });
      expect(storage.upload).not.toHaveBeenCalled();
      expect(scanRepository.createBatch).not.toHaveBeenCalled();
    });

    it("rejects an invalid book id before touching storage", async () => {
      expect(await usecase.createBatch({ ...input, bookId: "../12" })).toMatchObject({
        status: "invalid",
      });
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it("refuses to create jobs while no prompt version is active", async () => {
      promptRepository.findActive.mockResolvedValue(null);
      await expect(usecase.createBatch(input)).rejects.toThrow("読み取りプロンプトが未保存です");
      expect(storage.upload).not.toHaveBeenCalled();
      expect(scanRepository.createBatch).not.toHaveBeenCalled();
    });

    it("removes already uploaded originals when the batch cannot be saved", async () => {
      scanRepository.createBatch.mockRejectedValue(new Error("database failed"));
      await expect(usecase.createBatch(input)).rejects.toThrow("database failed");
      expect(storage.remove).toHaveBeenCalledWith("key-1");
      expect(storage.remove).toHaveBeenCalledWith("key-2");
    });

    it("removes already uploaded originals when a later upload fails", async () => {
      storage.upload.mockReset();
      storage.upload
        .mockResolvedValueOnce({ status: "valid", value: "key-1" })
        .mockRejectedValueOnce(new Error("upload failed"));
      await expect(usecase.createBatch(input)).rejects.toThrow("upload failed");
      expect(storage.remove).toHaveBeenCalledWith("key-1");
      expect(scanRepository.createBatch).not.toHaveBeenCalled();
    });

    it("preserves both errors when cleanup also fails", async () => {
      const database = new Error("database failed");
      const cleanup = new Error("cleanup failed");
      scanRepository.createBatch.mockRejectedValue(database);
      storage.remove.mockRejectedValue(cleanup);
      await expect(usecase.createBatch(input)).rejects.toMatchObject({
        errors: [database, cleanup, cleanup],
      });
    });
  });

  describe("list", () => {
    it("adds the progress summary, the active version and the model", async () => {
      scanRepository.listBatches.mockResolvedValue([
        {
          id: "1",
          createdAt: "2026-09-09T00:00:00.000Z",
          jobs: [
            {
              id: "1",
              status: "succeeded",
              originalFilename: "a.jpg",
              mime: "image/jpeg",
              summary: "2026.09.01・グラス代 ¥683",
              error: null,
            },
            {
              id: "2",
              status: "queued",
              originalFilename: "b.pdf",
              mime: "application/pdf",
              summary: null,
              error: null,
            },
          ],
        },
      ]);
      const overview = await usecase.list("5", "12");
      expect(overview.activePromptVersion).toBe(3);
      expect(overview.model).toBe("claude-sonnet-5");
      expect(overview.batches[0].progress).toEqual({
        total: 2,
        succeeded: 1,
        failed: 0,
        percent: 50,
      });
    });

    it("reports no active version so the screen can block uploads", async () => {
      promptRepository.findActive.mockResolvedValue(null);
      scanRepository.listBatches.mockResolvedValue([]);
      expect(await usecase.list("5", "12")).toMatchObject({
        batches: [],
        activePromptVersion: null,
      });
    });
  });
});
