import { RetryScanJobUsecase } from "@/server/contexts/research-fund/application/usecases/retry-scan-job-usecase";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

describe("RetryScanJobUsecase", () => {
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
  const usecase = new RetryScanJobUsecase(scanRepository);

  beforeEach(() => jest.resetAllMocks());

  it("puts a failed job back in the queue", async () => {
    scanRepository.requeueJob.mockResolvedValue(true);
    expect(await usecase.execute({ bookId: "12", jobId: "11" })).toBe(true);
    expect(scanRepository.requeueJob).toHaveBeenCalledWith("12", "11");
  });

  it("reports failure when the job is no longer retryable", async () => {
    scanRepository.requeueJob.mockResolvedValue(false);
    expect(await usecase.execute({ bookId: "12", jobId: "11" })).toBe(false);
  });

  it("rejects an invalid job id", async () => {
    await expect(usecase.execute({ bookId: "12", jobId: "abc" })).rejects.toThrow();
    expect(scanRepository.requeueJob).not.toHaveBeenCalled();
  });
});
