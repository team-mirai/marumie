import { MaskingPageLimitError } from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import { ProcessDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/process-document-masking-usecase";
import { MASKING_MAX_RUNNING } from "@/server/contexts/research-fund/domain/models/document-masking";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
} from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import { RF_ERROR_CODES } from "@/server/contexts/research-fund/domain/types/validation";

const STARTED_AT = new Date("2026-10-18T00:00:00Z");
const DOCUMENT: ClaimedMaskingDocument = {
  documentId: "42",
  storageKey: "original-key",
  mime: "application/pdf",
  instruction: null,
  startedAt: STARTED_AT,
};

describe("ProcessDocumentMaskingUsecase", () => {
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
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const masking = { mask: jest.fn() };
  const queue = { enabled: true, notify: jest.fn() };
  const usecase = new ProcessDocumentMaskingUsecase(repository, storage, masking, queue);
  const masked = new Uint8Array([9, 9]);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.countUnfinished
      .mockResolvedValueOnce({ pending: 1, running: 0 })
      .mockResolvedValue({ pending: 0, running: 0 });
    repository.claimNext.mockResolvedValue(DOCUMENT);
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: null });
    storage.download.mockResolvedValue({ status: "valid", value: new Uint8Array([1, 2]) });
    storage.upload.mockResolvedValue({ status: "valid", value: "masked-key" });
    masking.mask.mockResolvedValue({ bytes: masked, mime: "application/pdf", regionCount: 3 });
  });

  it("未作成の書類を作成中にし、黒塗りした版を保存して作成済みにする", async () => {
    const result = await usecase.execute();

    expect(repository.claimNext).toHaveBeenCalledTimes(1);
    expect(storage.download).toHaveBeenCalledWith("original-key");
    expect(masking.mask).toHaveBeenCalledWith({
      bytes: new Uint8Array([1, 2]),
      mime: "application/pdf",
      instruction: null,
    });
    expect(storage.upload).toHaveBeenCalledWith(masked, "application/pdf");
    expect(repository.complete).toHaveBeenCalledWith({
      claimed: DOCUMENT,
      maskedKey: "masked-key",
      regionCount: 3,
    });
    expect(repository.fail).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
    expect(queue.notify).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, remaining: 0 });
  });

  it("書類に保存された追加の指示を添えて黒塗りする（キュー・定期実行から作るときも使う）", async () => {
    repository.claimNext.mockResolvedValue({ ...DOCUMENT, instruction: "注文者の氏名も黒塗りにして" });

    await usecase.execute();

    expect(masking.mask).toHaveBeenCalledWith(
      expect.objectContaining({ instruction: "注文者の氏名も黒塗りにして" }),
    );
  });

  it("作り直したときは、置き換えた前の版のファイルを消す", async () => {
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: "old-masked-key" });

    await usecase.execute();

    expect(storage.remove).toHaveBeenCalledWith("old-masked-key");
  });

  it("前の版のファイルを消せなくても作成済みのままにする", async () => {
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: "old-masked-key" });
    storage.remove.mockRejectedValue(new Error("storage down"));

    const result = await usecase.execute();

    expect(repository.fail).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(1);
  });

  it("作成中に失効して別の実行が着手し直していたら、作った版を記録せずに消す", async () => {
    repository.complete.mockResolvedValue({ recorded: false });

    const result = await usecase.execute();

    expect(storage.remove).toHaveBeenCalledWith("masked-key");
    expect(repository.fail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ succeeded: 0, failed: 1 });
  });

  it("作成中が上限に達していれば着手しない（作成中の処理が終わったときに次を依頼するので取りこぼさない）", async () => {
    repository.countUnfinished.mockReset().mockResolvedValue({ pending: 2, running: MASKING_MAX_RUNNING });

    const result = await usecase.execute();

    expect(repository.claimNext).not.toHaveBeenCalled();
    expect(masking.mask).not.toHaveBeenCalled();
    expect(queue.notify).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, remaining: 2 + MASKING_MAX_RUNNING });
  });

  it("同じメッセージが 2 回届いても、別の実行が着手済みの書類は作らない", async () => {
    // 1 回目の配送で着手済みなので、2 回目の配送では着手できる書類が無い
    repository.countUnfinished.mockReset().mockResolvedValue({ pending: 0, running: 1 });
    repository.claimNext.mockResolvedValue(null);

    const result = await usecase.execute();

    expect(masking.mask).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
    expect(repository.fail).not.toHaveBeenCalled();
    expect(queue.notify).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, remaining: 1 });
  });

  it("作り終えて未作成の書類が残っていれば、次を作るようキューに依頼する", async () => {
    repository.countUnfinished
      .mockReset()
      .mockResolvedValueOnce({ pending: 3, running: 0 })
      .mockResolvedValue({ pending: 2, running: 0 });

    expect(await usecase.execute()).toMatchObject({ processed: 1, remaining: 2 });
    expect(queue.notify).toHaveBeenCalledTimes(1);
    expect(queue.notify.mock.invocationCallOrder[0]).toBeGreaterThan(
      repository.complete.mock.invocationCallOrder[0],
    );
  });

  it("作成に失敗しても、未作成の書類が残っていれば次を依頼する（1 件の失敗で止めない）", async () => {
    masking.mask.mockRejectedValue(new Error("rate limited"));
    repository.countUnfinished
      .mockReset()
      .mockResolvedValueOnce({ pending: 2, running: 0 })
      .mockResolvedValue({ pending: 1, running: 0 });

    expect(await usecase.execute()).toMatchObject({ failed: 1, remaining: 1 });
    expect(queue.notify).toHaveBeenCalledTimes(1);
  });

  it("ページ数の上限を超える書類は、上限を超えた理由で失敗にする", async () => {
    masking.mask.mockRejectedValue(new MaskingPageLimitError(21));

    const result = await usecase.execute();

    expect(repository.fail).toHaveBeenCalledWith(
      DOCUMENT,
      "21ページあり、黒塗りできるページ数の上限（20ページ）を超えています",
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, remaining: 0 });
  });

  it("黒塗りに失敗したら、理由を残して失敗にする（元の書類を公開用の版にしない）", async () => {
    masking.mask.mockRejectedValue(new Error("Failed to detect personal info on page 2: rate limited"));

    await usecase.execute();

    expect(repository.fail).toHaveBeenCalledWith(
      DOCUMENT,
      "Failed to detect personal info on page 2: rate limited",
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("失敗の理由は 500 文字までにする", async () => {
    masking.mask.mockRejectedValue(new Error("x".repeat(600)));

    await usecase.execute();

    expect(repository.fail.mock.calls[0][1]).toHaveLength(500);
  });

  it("黒塗りできない形式の書類は、書類を取り出さずに失敗にする", async () => {
    repository.claimNext.mockResolvedValue({ ...DOCUMENT, mime: "image/gif" });

    await usecase.execute();

    expect(storage.download).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith(
      { ...DOCUMENT, mime: "image/gif" },
      "JPG・PNG・PDFのみ公開用の版を作れます",
    );
  });

  it("原本を取り出せなければ失敗にする", async () => {
    storage.download.mockResolvedValue({
      status: "invalid",
      errors: [
        { path: "document", code: RF_ERROR_CODES.INVALID_DOCUMENT, message: "原本がありません", severity: "error" },
      ],
    });

    await usecase.execute();

    expect(masking.mask).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith(DOCUMENT, "原本がありません");
  });
});
