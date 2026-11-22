import { RequestDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/request-document-masking-usecase";
import {
  DocumentMaskingPolicy,
  MASKING_INSTRUCTION_MAX_LENGTH,
} from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

describe("RequestDocumentMaskingUsecase", () => {
  const repository = { request: jest.fn() } as unknown as jest.Mocked<DocumentMaskingRepository>;
  const usecase = new RequestDocumentMaskingUsecase(repository);

  beforeEach(() => jest.resetAllMocks());

  const requestable = DocumentMaskingPolicy.requestableStatuses;

  it("帳簿の書類を、依頼を受けられる状態のときだけ作る・作り直す対象に戻す", async () => {
    repository.request.mockResolvedValue({ requested: true });

    expect(await usecase.execute({ bookId: "12", documentId: "42" })).toEqual({
      status: "valid",
      value: undefined,
    });
    expect(repository.request).toHaveBeenCalledWith("12", "42", null, requestable);
  });

  it("追加の指示は前後の空白を落として書類に保存し、空欄なら指示なしにする", async () => {
    repository.request.mockResolvedValue({ requested: true });

    await usecase.execute({ bookId: "12", documentId: "42", instruction: "  注文者の氏名も黒塗りにして\n" });
    await usecase.execute({ bookId: "12", documentId: "42", instruction: "   " });

    expect(repository.request).toHaveBeenNthCalledWith(1, "12", "42", "注文者の氏名も黒塗りにして", requestable);
    expect(repository.request).toHaveBeenNthCalledWith(2, "12", "42", null, requestable);
  });

  it("上限を超える追加の指示は受け付けない", async () => {
    const result = await usecase.execute({
      bookId: "12",
      documentId: "42",
      instruction: "あ".repeat(MASKING_INSTRUCTION_MAX_LENGTH + 1),
    });

    expect(result.status === "invalid" && result.errors[0].message).toBe(
      `追加の指示は${MASKING_INSTRUCTION_MAX_LENGTH}文字以内で入力してください`,
    );
    expect(repository.request).not.toHaveBeenCalled();
  });

  it("作成中の書類は二重に作らないため受け付けない", async () => {
    repository.request.mockResolvedValue({ requested: false, status: "running" });

    const result = await usecase.execute({ bookId: "12", documentId: "42" });

    expect(result.status).toBe("invalid");
    if (result.status === "invalid")
      expect(result.errors[0].message).toBe("公開用の版を作成中です。終わってから作り直してください");
  });

  it("戻せなかった直後に作成が終わっていたら、もう一度依頼する", async () => {
    repository.request
      .mockResolvedValueOnce({ requested: false, status: "succeeded" })
      .mockResolvedValueOnce({ requested: true });

    expect(await usecase.execute({ bookId: "12", documentId: "42" })).toEqual({
      status: "valid",
      value: undefined,
    });
    expect(repository.request).toHaveBeenCalledTimes(2);
  });

  it("依頼し直しても状態が変わり続けるときは、回数を限って諦める", async () => {
    repository.request.mockResolvedValue({ requested: false, status: "pending" });

    await expect(usecase.execute({ bookId: "12", documentId: "42" })).rejects.toThrow();
    expect(repository.request).toHaveBeenCalledTimes(3);
  });

  it("帳簿に無い書類は見つからないとする", async () => {
    repository.request.mockResolvedValue(null);

    const result = await usecase.execute({ bookId: "12", documentId: "42" });

    expect(result.status === "invalid" && result.errors[0].message).toBe("書類が見つかりません");
  });

  it("不正な ID では依頼しない", async () => {
    const result = await usecase.execute({ bookId: "12", documentId: "x" });

    expect(result.status).toBe("invalid");
    expect(repository.request).not.toHaveBeenCalled();
  });
});
