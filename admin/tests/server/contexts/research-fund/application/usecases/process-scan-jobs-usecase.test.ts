import { ProcessScanJobsUsecase } from "@/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase";
import {
  SCAN_JOB_BATCH_SIZE,
  ScanJobError,
} from "@/server/contexts/research-fund/domain/models/scan-job";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { ReceiptExtractionGateway } from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import type {
  ClaimedScanJob,
  ScanRepository,
} from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ExtractedReceipt } from "@/server/contexts/research-fund/domain/models/extracted-receipt";
import { RF_ERROR_CODES } from "@/server/contexts/research-fund/domain/types/validation";

const JOB: ClaimedScanJob = {
  id: "11",
  documentId: "42",
  storageKey: "key-1",
  mime: "image/jpeg",
  originalFilename: "IMG_1.jpg",
  officePrompt: "議員室プロンプト",
  rereadInstruction: null,
};

const RECEIPT = {
  date: "2026-04-01",
  items: [
    { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
  ],
} as const;

describe("ProcessScanJobsUsecase", () => {
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
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const gateway: jest.Mocked<ReceiptExtractionGateway> = { extract: jest.fn() };
  const usecase = new ProcessScanJobsUsecase(scanRepository, storage, gateway);
  const input = { bookId: "12", userId: "user-1" };

  beforeEach(() => {
    jest.resetAllMocks();
    scanRepository.releaseStaleJobs.mockResolvedValue(0);
    scanRepository.countUnfinished
      .mockResolvedValueOnce({ queued: 1, running: 0 })
      .mockResolvedValue({ queued: 0, running: 0 });
    scanRepository.claimJobs.mockResolvedValue([JOB]);
    scanRepository.accounts.mockResolvedValue([
      { key: "bank", type: "asset" },
      { key: "taxi", type: "expense" },
      { key: "needs-review", type: "expense" },
    ]);
    storage.download.mockResolvedValue({ status: "valid", value: new Uint8Array([1, 2]) });
    gateway.extract.mockResolvedValue({ status: "valid", value: { ...RECEIPT, items: [...RECEIPT.items] } });
  });

  describe("execute", () => {
    it("reads a queued job with the prompt recorded on it and saves the draft entries", async () => {
      const result = await usecase.execute(input);

      expect(gateway.extract).toHaveBeenCalledWith({
        document: { bytes: new Uint8Array([1, 2]), mime: "image/jpeg" },
        officePrompt: "議員室プロンプト",
        rereadInstruction: null,
      });
      expect(scanRepository.completeJob).toHaveBeenCalledWith(
        expect.objectContaining({
          bookId: "12",
          // 通常のスキャンは既存の下書きを置き換えない
          replaceDrafts: false,
          jobId: "11",
          documentId: "42",
          rawJson: expect.objectContaining({ date: "2026-04-01" }),
          userId: "user-1",
          entries: [
            expect.objectContaining({
              entryDate: "2026-04-01",
              description: "タクシー代",
              accountKey: "taxi",
              amount: 1200,
            }),
          ],
        }),
      );
      expect(scanRepository.failJob).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, hasMore: false });
    });

    it("claims only a few jobs at a time so one call fits in the serverless timeout", async () => {
      await usecase.execute(input);
      expect(scanRepository.claimJobs).toHaveBeenCalledWith("12", SCAN_JOB_BATCH_SIZE);
    });

    it("starts nothing while other jobs are still running", async () => {
      jest.resetAllMocks();
      scanRepository.releaseStaleJobs.mockResolvedValue(0);
      scanRepository.countUnfinished.mockResolvedValue({ queued: 5, running: SCAN_JOB_BATCH_SIZE });

      const result = await usecase.execute(input);

      expect(scanRepository.claimJobs).not.toHaveBeenCalled();
      expect(gateway.extract).not.toHaveBeenCalled();
      expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, hasMore: true });
    });

    it("releases jobs stuck in running before looking for work", async () => {
      await usecase.execute(input);
      expect(scanRepository.releaseStaleJobs).toHaveBeenCalledWith("12", expect.any(Date));
      expect(scanRepository.releaseStaleJobs.mock.invocationCallOrder[0]).toBeLessThan(
        scanRepository.claimJobs.mock.invocationCallOrder[0],
      );
    });

    it("reports there is more work while jobs remain, so the screen keeps calling", async () => {
      jest.resetAllMocks();
      scanRepository.releaseStaleJobs.mockResolvedValue(0);
      scanRepository.countUnfinished
        .mockResolvedValueOnce({ queued: 3, running: 0 })
        .mockResolvedValue({ queued: 2, running: 0 });
      scanRepository.claimJobs.mockResolvedValue([JOB]);
      scanRepository.accounts.mockResolvedValue([
        { key: "bank", type: "asset" },
        { key: "taxi", type: "expense" },
      ]);
      storage.download.mockResolvedValue({ status: "valid", value: new Uint8Array([1]) });
      gateway.extract.mockResolvedValue({
        status: "valid",
        value: { ...RECEIPT, items: [...RECEIPT.items] },
      });

      expect(await usecase.execute(input)).toMatchObject({ hasMore: true });
    });

    it("records the extraction error on the job instead of throwing", async () => {
      gateway.extract.mockResolvedValue({
        status: "invalid",
        errors: [
          {
            path: "",
            code: RF_ERROR_CODES.EXTRACTION_FAILED,
            message: "領収書の読み取りに失敗しました",
            severity: "error",
          },
        ],
      });

      const result = await usecase.execute(input);

      expect(scanRepository.failJob).toHaveBeenCalledWith("11", "領収書の読み取りに失敗しました");
      expect(scanRepository.completeJob).not.toHaveBeenCalled();
      expect(result).toMatchObject({ processed: 1, succeeded: 0, failed: 1 });
    });

    it("records the raw output when the extraction cannot be turned into entries", async () => {
      scanRepository.accounts.mockResolvedValue([{ key: "bank", type: "asset" }]);

      await usecase.execute(input);

      expect(scanRepository.failJob).toHaveBeenCalledWith(
        "11",
        expect.stringContaining("taxi"),
        expect.objectContaining({ date: "2026-04-01" }),
      );
    });

    it("fails only the broken job and keeps going with the rest", async () => {
      scanRepository.claimJobs.mockResolvedValue([JOB, { ...JOB, id: "12", documentId: "43" }]);
      storage.download
        .mockReset()
        .mockRejectedValueOnce(new Error("領収書の原本の取得に失敗しました"))
        .mockResolvedValue({ status: "valid", value: new Uint8Array([1]) });

      const result = await usecase.execute(input);

      expect(scanRepository.failJob).toHaveBeenCalledWith(
        "11",
        "領収書の原本の取得に失敗しました",
        undefined,
      );
      expect(scanRepository.completeJob).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ processed: 2, succeeded: 1, failed: 1 });
    });

    describe("reread jobs", () => {
      const REREAD_JOB: ClaimedScanJob = {
        ...JOB,
        rereadInstruction: "タクシー代と駐車場代は別の科目として入れ直してください",
      };
      const SPLIT_RECEIPT: ExtractedReceipt = {
        date: "2026-04-01",
        items: [
          { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: "g1" },
          { item: "駐車場代", amount: 800, category_key: "tolls-parking", note: null, split_group: "g1" },
        ],
      };

      beforeEach(() => {
        scanRepository.claimJobs.mockResolvedValue([REREAD_JOB]);
        scanRepository.accounts.mockResolvedValue([
          { key: "bank", type: "asset" },
          { key: "taxi", type: "expense" },
          { key: "tolls-parking", type: "expense" },
        ]);
      });

      it("passes the instruction to the LLM and replaces the document's drafts with the result", async () => {
        gateway.extract.mockResolvedValue({ status: "valid", value: SPLIT_RECEIPT });

        const result = await usecase.execute(input);

        expect(gateway.extract).toHaveBeenCalledWith(
          expect.objectContaining({
            officePrompt: "議員室プロンプト",
            rereadInstruction: "タクシー代と駐車場代は別の科目として入れ直してください",
          }),
        );
        expect(scanRepository.completeJob).toHaveBeenCalledWith(
          expect.objectContaining({
            documentId: "42",
            replaceDrafts: true,
            entries: [
              expect.objectContaining({ accountKey: "taxi", amount: 1200 }),
              expect.objectContaining({ accountKey: "tolls-parking", amount: 800 }),
            ],
          }),
        );
        expect(result).toMatchObject({ succeeded: 1, failed: 0 });
      });

      it("keeps the original drafts when the reread fails", async () => {
        gateway.extract.mockResolvedValue({
          status: "invalid",
          errors: [
            {
              path: "",
              code: RF_ERROR_CODES.EXTRACTION_FAILED,
              message: "領収書の読み取りに失敗しました",
              severity: "error",
            },
          ],
        });

        const result = await usecase.execute(input);

        // 置き換え（completeJob）は読み取りに成功したときだけ起きる
        expect(scanRepository.completeJob).not.toHaveBeenCalled();
        expect(scanRepository.failJob).toHaveBeenCalledWith("11", "領収書の読み取りに失敗しました");
        expect(result).toMatchObject({ succeeded: 0, failed: 1 });
      });

      it("fails the job without replacing anything when the document now has reviewed entries", async () => {
        gateway.extract.mockResolvedValue({ status: "valid", value: SPLIT_RECEIPT });
        scanRepository.completeJob.mockRejectedValue(
          new ScanJobError("確認済・公開中の仕訳があるため、読み直した結果で置き換えませんでした"),
        );

        const result = await usecase.execute(input);

        expect(scanRepository.failJob).toHaveBeenCalledWith(
          "11",
          "確認済・公開中の仕訳があるため、読み直した結果で置き換えませんでした",
          expect.objectContaining({ date: "2026-04-01" }),
        );
        expect(result).toMatchObject({ succeeded: 0, failed: 1 });
      });
    });

    it("rejects a book id that is not a valid identifier", async () => {
      await expect(usecase.execute({ bookId: "0; DROP", userId: "user-1" })).rejects.toThrow();
      expect(scanRepository.claimJobs).not.toHaveBeenCalled();
    });
  });

  describe("retry", () => {
    it("puts a failed job back in the queue", async () => {
      scanRepository.requeueJob.mockResolvedValue(true);
      expect(await usecase.retry({ bookId: "12", jobId: "11" })).toBe(true);
      expect(scanRepository.requeueJob).toHaveBeenCalledWith("12", "11");
    });

    it("reports failure when the job is no longer retryable", async () => {
      scanRepository.requeueJob.mockResolvedValue(false);
      expect(await usecase.retry({ bookId: "12", jobId: "11" })).toBe(false);
    });

    it("rejects an invalid job id", async () => {
      await expect(usecase.retry({ bookId: "12", jobId: "abc" })).rejects.toThrow();
      expect(scanRepository.requeueJob).not.toHaveBeenCalled();
    });
  });
});
