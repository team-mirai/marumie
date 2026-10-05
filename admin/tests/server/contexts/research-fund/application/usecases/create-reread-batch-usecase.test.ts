import { CreateRereadBatchUsecase } from "@/server/contexts/research-fund/application/usecases/create-reread-batch-usecase";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import { RF_ERROR_CODES } from "@/server/contexts/research-fund/domain/types/validation";

const ACTIVE_PROMPT = {
  id: "7",
  version: 3,
  body: "本文",
  isActive: true,
  updatedAt: "2026-09-01T00:00:00.000Z",
  jobCount: 0,
};

describe("CreateRereadBatchUsecase", () => {
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
  };
  const promptRepository: jest.Mocked<PromptRepository> = {
    list: jest.fn(),
    create: jest.fn(),
    activate: jest.fn(),
    findActive: jest.fn(),
  };
  const usecase = new CreateRereadBatchUsecase(scanRepository, promptRepository, "claude-sonnet-5");
  const rereadInput = {
    politicianId: "5",
    bookId: "12",
    userId: "user-1",
    entryIds: ["101", "102", "103"],
    instruction: "  タクシー代と駐車場代は異なるから、これらは別の科目として入れ直してください  ",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    promptRepository.findActive.mockResolvedValue(ACTIVE_PROMPT);
    scanRepository.createRereadBatch.mockResolvedValue("100");
  });

  it("queues one reread job per document with the trimmed instruction", async () => {
    scanRepository.findRereadCandidates.mockResolvedValue([
      { documentId: "42", hasReviewedEntries: false },
      { documentId: "43", hasReviewedEntries: false },
    ]);

    expect(await usecase.execute(rereadInput)).toEqual({
      status: "valid",
      value: { batchId: "100", documentCount: 2, excludedCount: 0 },
    });
    expect(scanRepository.findRereadCandidates).toHaveBeenCalledWith("12", ["101", "102", "103"]);
    expect(scanRepository.createRereadBatch).toHaveBeenCalledWith({
      bookId: "12",
      uploadedById: "user-1",
      promptId: "7",
      model: "claude-sonnet-5",
      documentIds: ["42", "43"],
      instruction: "タクシー代と駐車場代は異なるから、これらは別の科目として入れ直してください",
    });
  });

  it("leaves out documents that have approved or published entries", async () => {
    scanRepository.findRereadCandidates.mockResolvedValue([
      { documentId: "42", hasReviewedEntries: false },
      { documentId: "43", hasReviewedEntries: true },
    ]);

    expect(await usecase.execute(rereadInput)).toEqual({
      status: "valid",
      value: { batchId: "100", documentCount: 1, excludedCount: 1 },
    });
    expect(scanRepository.createRereadBatch).toHaveBeenCalledWith(
      expect.objectContaining({ documentIds: ["42"] }),
    );
  });

  it("creates no jobs when every document has reviewed entries", async () => {
    scanRepository.findRereadCandidates.mockResolvedValue([
      { documentId: "43", hasReviewedEntries: true },
    ]);

    expect(await usecase.execute(rereadInput)).toMatchObject({
      status: "invalid",
      errors: [{ message: expect.stringContaining("確認済・公開中") }],
    });
    expect(scanRepository.createRereadBatch).not.toHaveBeenCalled();
  });

  it("creates no jobs when no selected draft has a document", async () => {
    scanRepository.findRereadCandidates.mockResolvedValue([]);

    expect(await usecase.execute(rereadInput)).toMatchObject({
      status: "invalid",
      errors: [{ message: "書類の紐づいた下書きを選んでください" }],
    });
    expect(scanRepository.createRereadBatch).not.toHaveBeenCalled();
  });

  it("requires an instruction", async () => {
    expect(await usecase.execute({ ...rereadInput, instruction: "  " })).toMatchObject({
      status: "invalid",
      errors: [{ code: RF_ERROR_CODES.INVALID_REREAD_INSTRUCTION }],
    });
    expect(scanRepository.findRereadCandidates).not.toHaveBeenCalled();
  });

  it("rejects invalid entry ids before touching the repository", async () => {
    expect(await usecase.execute({ ...rereadInput, entryIds: ["1; DROP"] })).toMatchObject({
      status: "invalid",
    });
    expect(await usecase.execute({ ...rereadInput, entryIds: [] })).toMatchObject({
      status: "invalid",
    });
    expect(scanRepository.findRereadCandidates).not.toHaveBeenCalled();
  });

  it("refuses to reread while no prompt version is active", async () => {
    promptRepository.findActive.mockResolvedValue(null);
    await expect(usecase.execute(rereadInput)).rejects.toThrow("読み取りプロンプトが未保存です");
    expect(scanRepository.createRereadBatch).not.toHaveBeenCalled();
  });
});
