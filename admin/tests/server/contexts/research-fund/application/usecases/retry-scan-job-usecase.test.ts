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
    findJobStatus: jest.fn(),
    requeueJob: jest.fn(),
    accounts: jest.fn(),
    payees: jest.fn(),
  };
  const usecase = new RetryScanJobUsecase(scanRepository);

  beforeEach(() => jest.resetAllMocks());

  const rejection = {
    status: "invalid",
    errors: [
      expect.objectContaining({
        message: "このジョブは再実行できません。画面を再読み込みしてください",
      }),
    ],
  };

  it("puts a failed job back in the queue only while it is still failed", async () => {
    scanRepository.findJobStatus.mockResolvedValue("failed");
    scanRepository.requeueJob.mockResolvedValue(true);
    expect(await usecase.execute({ bookId: "12", jobId: "11" })).toEqual({
      status: "valid",
      value: undefined,
    });
    expect(scanRepository.findJobStatus).toHaveBeenCalledWith("12", "11");
    expect(scanRepository.requeueJob).toHaveBeenCalledWith("12", "11", "failed");
  });

  it.each(["queued", "running", "succeeded"] as const)(
    "rejects a %s job without requeueing it",
    async (status) => {
      scanRepository.findJobStatus.mockResolvedValue(status);
      expect(await usecase.execute({ bookId: "12", jobId: "11" })).toEqual(rejection);
      expect(scanRepository.requeueJob).not.toHaveBeenCalled();
    },
  );

  it("rejects a job that is not in the book", async () => {
    scanRepository.findJobStatus.mockResolvedValue(null);
    expect(await usecase.execute({ bookId: "12", jobId: "11" })).toEqual(rejection);
    expect(scanRepository.requeueJob).not.toHaveBeenCalled();
  });

  it("rejects when another retry changed the job after the check", async () => {
    scanRepository.findJobStatus.mockResolvedValue("failed");
    scanRepository.requeueJob.mockResolvedValue(false);
    expect(await usecase.execute({ bookId: "12", jobId: "11" })).toEqual(rejection);
  });

  it("rejects an invalid job id", async () => {
    await expect(usecase.execute({ bookId: "12", jobId: "abc" })).rejects.toThrow();
    expect(scanRepository.findJobStatus).not.toHaveBeenCalled();
    expect(scanRepository.requeueJob).not.toHaveBeenCalled();
  });
});
