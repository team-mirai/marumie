import { GetMaskedDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-masked-document-usecase";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";

describe("GetMaskedDocumentUsecase", () => {
  const repository = { findMaskedKey: jest.fn() } as unknown as jest.Mocked<DocumentMaskingRepository>;
  const storage = { createSignedUrl: jest.fn() } as unknown as jest.Mocked<DocumentStorage>;
  const usecase = new GetMaskedDocumentUsecase(repository, storage);
  const input = { bookId: "12", documentId: "42", expiresIn: 300 };

  beforeEach(() => jest.resetAllMocks());

  it("公開用の版の署名 URL を返す", async () => {
    repository.findMaskedKey.mockResolvedValue("masked-key");
    storage.createSignedUrl.mockResolvedValue({ status: "valid", value: "https://signed" });

    expect(await usecase.execute(input)).toEqual({
      status: "valid",
      value: { signedUrl: "https://signed" },
    });
    expect(repository.findMaskedKey).toHaveBeenCalledWith("12", "42");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("masked-key", 300);
  });

  it.each([
    [null, "公開用の版はまだありません"],
    [undefined, "書類が見つかりません"],
  ])("版のキーが %p なら署名 URL を作らない", async (key, message) => {
    repository.findMaskedKey.mockResolvedValue(key);

    const result = await usecase.execute(input);

    expect(result.status === "invalid" && result.errors[0].message).toBe(message);
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
});
