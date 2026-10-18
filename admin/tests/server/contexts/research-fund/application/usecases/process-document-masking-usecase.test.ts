import { MaskingPageLimitError } from "@/server/contexts/research-fund/application/services/receipt-masking-service";
import { ProcessDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/process-document-masking-usecase";
import {
  MASKING_BATCH_SIZE,
  MASKING_STALE_MS,
} from "@/server/contexts/research-fund/domain/models/document-masking";
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
  startedAt: STARTED_AT,
};

describe("ProcessDocumentMaskingUsecase", () => {
  const repository: jest.Mocked<DocumentMaskingRepository> = {
    findMaskedKey: jest.fn(),
    listByBook: jest.fn(),
    countUnfinished: jest.fn(),
    releaseStale: jest.fn(),
    claim: jest.fn(),
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
  const usecase = new ProcessDocumentMaskingUsecase(repository, storage, masking);
  const masked = new Uint8Array([9, 9]);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.releaseStale.mockResolvedValue(0);
    repository.countUnfinished
      .mockResolvedValueOnce({ pending: 1, running: 0 })
      .mockResolvedValue({ pending: 0, running: 0 });
    repository.claim.mockResolvedValue([DOCUMENT]);
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: null });
    storage.download.mockResolvedValue({ status: "valid", value: new Uint8Array([1, 2]) });
    storage.upload.mockResolvedValue({ status: "valid", value: "masked-key" });
    masking.mask.mockResolvedValue({ bytes: masked, mime: "application/pdf", regionCount: 3 });
  });

  it("未作成の書類を作成中にし、黒塗りした版を保存して作成済みにする", async () => {
    const result = await usecase.execute({ bookId: "12" });

    expect(repository.claim).toHaveBeenCalledWith("12", MASKING_BATCH_SIZE);
    expect(storage.download).toHaveBeenCalledWith("original-key");
    expect(masking.mask).toHaveBeenCalledWith({
      bytes: new Uint8Array([1, 2]),
      mime: "application/pdf",
    });
    expect(storage.upload).toHaveBeenCalledWith(masked, "application/pdf");
    expect(repository.complete).toHaveBeenCalledWith({
      claimed: DOCUMENT,
      maskedKey: "masked-key",
      regionCount: 3,
    });
    expect(repository.fail).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0, hasMore: false });
  });

  it("作り直したときは、置き換えた前の版のファイルを消す", async () => {
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: "old-masked-key" });

    await usecase.execute({ bookId: "12" });

    expect(storage.remove).toHaveBeenCalledWith("old-masked-key");
  });

  it("前の版のファイルを消せなくても作成済みのままにする", async () => {
    repository.complete.mockResolvedValue({ recorded: true, replacedKey: "old-masked-key" });
    storage.remove.mockRejectedValue(new Error("storage down"));

    const result = await usecase.execute({ bookId: "12" });

    expect(repository.fail).not.toHaveBeenCalled();
    expect(result.succeeded).toBe(1);
  });

  it("作成中に失効して別の実行が着手し直していたら、作った版を記録せずに消す", async () => {
    repository.complete.mockResolvedValue({ recorded: false });

    const result = await usecase.execute({ bookId: "12" });

    expect(storage.remove).toHaveBeenCalledWith("masked-key");
    expect(repository.fail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ succeeded: 0, failed: 1 });
  });

  it("作成中のまま止まった書類を、着手の前に失効の時刻で待機に戻す", async () => {
    const now = Date.now();
    await usecase.execute({ bookId: "12" });

    const staleBefore = repository.releaseStale.mock.calls[0][1];
    expect(repository.releaseStale.mock.calls[0][0]).toBe("12");
    expect(Math.abs(now - MASKING_STALE_MS - staleBefore.getTime())).toBeLessThan(1000);
    expect(repository.releaseStale.mock.invocationCallOrder[0]).toBeLessThan(
      repository.claim.mock.invocationCallOrder[0],
    );
  });

  it("別の実行が作成中なら着手せず、残りがあることだけを返す（同じ書類を二重に作らない）", async () => {
    repository.countUnfinished.mockReset().mockResolvedValue({ pending: 2, running: MASKING_BATCH_SIZE });

    const result = await usecase.execute({ bookId: "12" });

    expect(repository.claim).not.toHaveBeenCalled();
    expect(masking.mask).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0, hasMore: true });
  });

  it("処理した後も未作成の書類が残っていれば hasMore を返す", async () => {
    repository.countUnfinished
      .mockReset()
      .mockResolvedValueOnce({ pending: 3, running: 0 })
      .mockResolvedValue({ pending: 2, running: 0 });

    expect(await usecase.execute({ bookId: "12" })).toMatchObject({ processed: 1, hasMore: true });
  });

  it("ページ数の上限を超える書類は、上限を超えた理由で失敗にする", async () => {
    masking.mask.mockRejectedValue(new MaskingPageLimitError(21));

    const result = await usecase.execute({ bookId: "12" });

    expect(repository.fail).toHaveBeenCalledWith(
      DOCUMENT,
      "21ページあり、黒塗りできるページ数の上限（20ページ）を超えています",
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1, hasMore: false });
  });

  it("黒塗りに失敗したら、理由を残して失敗にする（元の書類を公開用の版にしない）", async () => {
    masking.mask.mockRejectedValue(new Error("Failed to detect personal info on page 2: rate limited"));

    await usecase.execute({ bookId: "12" });

    expect(repository.fail).toHaveBeenCalledWith(
      DOCUMENT,
      "Failed to detect personal info on page 2: rate limited",
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("失敗の理由は 500 文字までにする", async () => {
    masking.mask.mockRejectedValue(new Error("x".repeat(600)));

    await usecase.execute({ bookId: "12" });

    expect(repository.fail.mock.calls[0][1]).toHaveLength(500);
  });

  it("黒塗りできない形式の書類は、書類を取り出さずに失敗にする", async () => {
    repository.claim.mockResolvedValue([{ ...DOCUMENT, mime: "image/gif" }]);

    await usecase.execute({ bookId: "12" });

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

    await usecase.execute({ bookId: "12" });

    expect(masking.mask).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith(DOCUMENT, "原本がありません");
  });

  it("不正な帳簿 ID では何もしない", async () => {
    await expect(usecase.execute({ bookId: "abc" })).rejects.toThrow("有効なIDを指定してください");
    expect(repository.releaseStale).not.toHaveBeenCalled();
  });
});
