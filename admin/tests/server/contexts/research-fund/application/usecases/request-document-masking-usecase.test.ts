import { RequestDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/request-document-masking-usecase";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

describe("RequestDocumentMaskingUsecase", () => {
  const repository = { request: jest.fn() } as unknown as jest.Mocked<DocumentMaskingRepository>;
  const usecase = new RequestDocumentMaskingUsecase(repository);

  beforeEach(() => jest.resetAllMocks());

  it("帳簿の書類を作る・作り直す対象に戻す", async () => {
    repository.request.mockResolvedValue("requested");

    expect(await usecase.execute({ bookId: "12", documentId: "42" })).toEqual({
      status: "valid",
      value: undefined,
    });
    expect(repository.request).toHaveBeenCalledWith("12", "42");
  });

  it("作成中の書類は二重に作らないため受け付けない", async () => {
    repository.request.mockResolvedValue("running");

    const result = await usecase.execute({ bookId: "12", documentId: "42" });

    expect(result.status).toBe("invalid");
    if (result.status === "invalid")
      expect(result.errors[0].message).toBe("公開用の版を作成中です。終わってから作り直してください");
  });

  it("帳簿に無い書類は見つからないとする", async () => {
    repository.request.mockResolvedValue("not-found");

    const result = await usecase.execute({ bookId: "12", documentId: "42" });

    expect(result.status === "invalid" && result.errors[0].message).toBe("書類が見つかりません");
  });

  it("不正な ID では依頼しない", async () => {
    const result = await usecase.execute({ bookId: "12", documentId: "x" });

    expect(result.status).toBe("invalid");
    expect(repository.request).not.toHaveBeenCalled();
  });
});
