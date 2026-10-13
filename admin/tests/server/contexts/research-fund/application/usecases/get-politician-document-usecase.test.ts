import { GetPoliticianDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-politician-document-usecase";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";

describe("GetPoliticianDocumentUsecase", () => {
  const repository: jest.Mocked<DocumentRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByPolitician: jest.fn(),
    listByBook: jest.fn(),
  };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const usecase = new GetPoliticianDocumentUsecase(repository, storage);
  // 選択中の帳簿（12）とは別の帳簿の書類
  const document = {
    id: "3",
    bookId: "13",
    storageKey: "private-key",
    mime: "application/pdf",
    originalFilename: "receipt.pdf",
    createdAt: new Date(),
  };
  const input = { politicianId: "5", documentId: "3", expiresIn: 300 };
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findByPolitician.mockResolvedValue(document);
    storage.createSignedUrl.mockResolvedValue({
      status: "valid",
      value: "https://storage.example/signed",
    });
  });
  it("signs the politician's document regardless of its book", async () => {
    expect(await usecase.execute(input)).toEqual({
      status: "valid",
      value: { document, signedUrl: "https://storage.example/signed" },
    });
    expect(repository.findByPolitician).toHaveBeenCalledWith("5", "3");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("private-key", 300);
  });
  it("never signs a document outside the politician's books", async () => {
    repository.findByPolitician.mockResolvedValue(null);
    expect(await usecase.execute(input)).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_DOCUMENT_NOT_FOUND" }],
    });
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
  it.each([
    { politicianId: "abc" },
    { documentId: "abc" },
    { expiresIn: 0 },
  ])("rejects invalid input %o before reading", async (override) => {
    expect(await usecase.execute({ ...input, ...override })).toMatchObject({ status: "invalid" });
    expect(repository.findByPolitician).not.toHaveBeenCalled();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });
});
