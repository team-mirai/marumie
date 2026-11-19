import { RecoverDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/recover-document-masking-usecase";
import {
  DocumentMaskingPolicy,
  MASKING_MAX_RUNNING,
  MASKING_STALE_MS,
} from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

describe("RecoverDocumentMaskingUsecase", () => {
  const repository: jest.Mocked<DocumentMaskingRepository> = {
    findMaskedKey: jest.fn(),
    listByBook: jest.fn(),
    countUnfinished: jest.fn(),
    releaseStale: jest.fn(),
    claimNext: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    request: jest.fn(),
  };
  const process = { execute: jest.fn() };
  const now = new Date("2026-10-19T10:00:00Z");

  beforeEach(() => {
    jest.resetAllMocks();
    repository.releaseStale.mockResolvedValue({ retried: 0, failed: 0 });
  });

  describe("キューを使える環境", () => {
    const queue = { enabled: true, notify: jest.fn() };
    const usecase = new RecoverDocumentMaskingUsecase(repository, queue, process);

    it("作成中のまま止まった書類を、失効の時刻と扱いを渡して作り直しの対象に戻す", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 0, running: 0 });
      repository.releaseStale.mockResolvedValue({ retried: 2, failed: 1 });

      const result = await usecase.execute(now);

      expect(repository.releaseStale).toHaveBeenCalledWith(
        new Date(now.getTime() - MASKING_STALE_MS),
        DocumentMaskingPolicy.staleOutcome,
      );
      expect(result).toMatchObject({ retried: 2, failedStale: 1 });
    });

    it("キューに積めなかった・前から未作成の書類が残っていれば、キューに依頼し直す", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 2, running: 0 });

      const result = await usecase.execute(now);

      expect(queue.notify).toHaveBeenCalledTimes(2);
      expect(queue.notify.mock.invocationCallOrder[0]).toBeGreaterThan(
        repository.releaseStale.mock.invocationCallOrder[0],
      );
      expect(process.execute).not.toHaveBeenCalled();
      expect(result).toEqual({ retried: 0, failedStale: 0, notified: 2, processed: 0, remaining: 2 });
    });

    it("依頼するのは作成中の空き枠の分だけにする（作成中の処理は終わると次を依頼する）", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 10, running: 1 });

      const result = await usecase.execute(now);

      expect(queue.notify).toHaveBeenCalledTimes(MASKING_MAX_RUNNING - 1);
      expect(result.notified).toBe(MASKING_MAX_RUNNING - 1);
    });

    it("未作成の書類が無ければ依頼しない", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 0, running: 1 });

      await usecase.execute(now);

      expect(queue.notify).not.toHaveBeenCalled();
    });
  });

  describe("キューを使えない環境（ローカルなど）", () => {
    const queue = { enabled: false, notify: jest.fn() };
    const usecase = new RecoverDocumentMaskingUsecase(repository, queue, process);

    it("止まった書類を戻したうえで、未作成の書類が尽きるまでその場で作る", async () => {
      repository.releaseStale.mockResolvedValue({ retried: 1, failed: 0 });
      process.execute
        .mockResolvedValueOnce({ processed: 1, remaining: 1 })
        .mockResolvedValueOnce({ processed: 1, remaining: 0 })
        .mockResolvedValue({ processed: 0, remaining: 0 });

      const result = await usecase.execute(now);

      expect(process.execute).toHaveBeenCalledTimes(3);
      expect(process.execute.mock.invocationCallOrder[0]).toBeGreaterThan(
        repository.releaseStale.mock.invocationCallOrder[0],
      );
      expect(queue.notify).not.toHaveBeenCalled();
      expect(result).toEqual({ retried: 1, failedStale: 0, notified: 0, processed: 2, remaining: 0 });
    });

    it("着手できる書類が無ければ何も作らない", async () => {
      process.execute.mockResolvedValue({ processed: 0, remaining: 1 });

      expect(await usecase.execute(now)).toMatchObject({ processed: 0, remaining: 1 });
      expect(process.execute).toHaveBeenCalledTimes(1);
    });
  });
});
