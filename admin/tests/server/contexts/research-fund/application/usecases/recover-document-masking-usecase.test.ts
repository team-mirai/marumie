import { RecoverDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/recover-document-masking-usecase";
import {
  MASKING_MAX_RUNNING,
  MASKING_STALE_MS,
} from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

describe("RecoverDocumentMaskingUsecase", () => {
  const repository: jest.Mocked<DocumentMaskingRepository> = {
    findMaskedKey: jest.fn(),
    listByBook: jest.fn(),
    countUnfinished: jest.fn(),
    findStalled: jest.fn(),
    release: jest.fn(),
    claimNext: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    request: jest.fn(),
  };
  const process = { execute: jest.fn() };
  const now = new Date("2026-10-19T10:00:00Z");

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findStalled.mockResolvedValue([]);
    repository.release.mockResolvedValue(true);
  });

  const stalled = (documentId: string, error: string | null) => ({
    documentId,
    startedAt: new Date("2026-10-19T09:00:00Z"),
    error,
  });

  describe("キューを使える環境", () => {
    const queue = { enabled: true, notify: jest.fn() };
    const usecase = new RecoverDocumentMaskingUsecase(repository, queue, process);

    it("作成中のまま止まった書類を、初めてなら作り直し待ちに、作り直しても止まったなら失敗にする", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 0, running: 0 });
      repository.findStalled.mockResolvedValue([
        stalled("1", null),
        stalled("2", "前回の作成が途中で止まったため、作り直しています"),
        stalled("3", null),
      ]);

      const result = await usecase.execute(now);

      expect(repository.findStalled).toHaveBeenCalledWith(new Date(now.getTime() - MASKING_STALE_MS));
      expect(repository.release.mock.calls.map(([document, destination]) => [document.documentId, destination.status])).toEqual([
        ["1", "pending"],
        ["2", "failed"],
        ["3", "pending"],
      ]);
      expect(result).toMatchObject({ retried: 2, failedStale: 1 });
    });

    it("見つけた後に作成が終わっていて記録できなかった書類は数えない", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 0, running: 0 });
      repository.findStalled.mockResolvedValue([stalled("1", null), stalled("2", "印")]);
      repository.release.mockResolvedValue(false);

      expect(await usecase.execute(now)).toMatchObject({ retried: 0, failedStale: 0 });
    });

    it("キューに積めなかった・前から未作成の書類が残っていれば、キューに依頼し直す", async () => {
      repository.countUnfinished.mockResolvedValue({ pending: 2, running: 0 });

      const result = await usecase.execute(now);

      expect(queue.notify).toHaveBeenCalledTimes(2);
      expect(queue.notify.mock.invocationCallOrder[0]).toBeGreaterThan(
        repository.findStalled.mock.invocationCallOrder[0],
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
      repository.findStalled.mockResolvedValue([stalled("1", null)]);
      process.execute
        .mockResolvedValueOnce({ processed: 1, remaining: 1 })
        .mockResolvedValueOnce({ processed: 1, remaining: 0 })
        .mockResolvedValue({ processed: 0, remaining: 0 });

      const result = await usecase.execute(now);

      expect(process.execute).toHaveBeenCalledTimes(3);
      expect(process.execute.mock.invocationCallOrder[0]).toBeGreaterThan(
        repository.release.mock.invocationCallOrder[0],
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
