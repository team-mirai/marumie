import { ListScanBatchesUsecase } from "@/server/contexts/research-fund/application/usecases/list-scan-batches-usecase";
import type { DuplicateDocumentRepository } from "@/server/contexts/research-fund/domain/repositories/duplicate-document-repository.interface";
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

describe("ListScanBatchesUsecase", () => {
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
  const duplicateDocumentRepository: jest.Mocked<DuplicateDocumentRepository> = {
    listScannedDocuments: jest.fn(),
  };
  const usecase = new ListScanBatchesUsecase(
    scanRepository,
    promptRepository,
    duplicateDocumentRepository,
    "claude-sonnet-5",
  );

  beforeEach(() => {
    jest.resetAllMocks();
    promptRepository.findActive.mockResolvedValue(ACTIVE_PROMPT);
    duplicateDocumentRepository.listScannedDocuments.mockResolvedValue([]);
  });

  it("adds the progress summary, the active version and the model", async () => {
    scanRepository.listBatches.mockResolvedValue([
      {
        id: "1",
        createdAt: "2026-09-09T00:00:00.000Z",
        jobs: [
          {
            id: "1",
            documentId: "21",
            status: "succeeded",
            originalFilename: "a.jpg",
            mime: "image/jpeg",
            summary: "2026.09.01・グラス代 ¥683",
            error: null,
          },
          {
            id: "2",
            documentId: "22",
            status: "queued",
            originalFilename: "b.pdf",
            mime: "application/pdf",
            summary: null,
            error: null,
          },
        ],
      },
    ]);
    const overview = await usecase.execute("5", "12");
    expect(overview.activePromptVersion).toBe(3);
    expect(overview.model).toBe("claude-sonnet-5");
    expect(overview.batches[0].progress).toEqual({
      total: 2,
      succeeded: 1,
      failed: 0,
      percent: 50,
    });
  });

  it("adds the book's documents that may be scanned twice, keyed by document", async () => {
    scanRepository.listBatches.mockResolvedValue([]);
    const receipt = {
      date: "2026-09-01",
      issuer: null,
      items: [{ item: "グラス代", amount: 683, category_key: "stationery-supplies" }],
    };
    duplicateDocumentRepository.listScannedDocuments.mockResolvedValue([
      { documentId: "21", originalFilename: "a.jpg", rawJson: receipt, payeeIds: [] },
      { documentId: "23", originalFilename: "c.jpg", rawJson: receipt, payeeIds: [] },
    ]);
    const overview = await usecase.execute("5", "12");
    expect(duplicateDocumentRepository.listScannedDocuments).toHaveBeenCalledWith("12");
    expect(overview.duplicates).toEqual({
      "21": [{ documentId: "23", originalFilename: "c.jpg", date: "2026-09-01", totalAmount: 683 }],
      "23": [{ documentId: "21", originalFilename: "a.jpg", date: "2026-09-01", totalAmount: 683 }],
    });
  });

  it("reports no active version so the screen can block uploads", async () => {
    promptRepository.findActive.mockResolvedValue(null);
    scanRepository.listBatches.mockResolvedValue([]);
    expect(await usecase.execute("5", "12")).toMatchObject({
      batches: [],
      activePromptVersion: null,
    });
  });
});
