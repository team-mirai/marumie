import { GetDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/get-document-usecase";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";

describe("GetDocumentUsecase", () => {
  const repository: jest.Mocked<DocumentRepository> = { create: jest.fn(), findById: jest.fn() };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const usecase = new GetDocumentUsecase(repository, storage);
  const document = {
    id: "3",
    bookId: "12",
    storageKey: "private-key",
    mime: "application/pdf",
    originalFilename: "receipt.pdf",
    createdAt: new Date(),
  };
  const input = { bookId: "12", documentId: "3", expiresIn: 300 };
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(document);
    storage.createSignedUrl.mockResolvedValue({
      status: "valid",
      value: "https://storage.example/signed",
    });
  });
  it("signs the stored key with the requested expiry", async () => {
    expect(await usecase.execute(input)).toEqual({
      status: "valid",
      value: { document, signedUrl: "https://storage.example/signed" },
    });
    expect(repository.findById).toHaveBeenCalledWith("12", "3");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("private-key", 300);
  });
  it.each([null, { ...document, bookId: "13" }])(
    "never signs an absent or different book document",
    async (row) => {
      repository.findById.mockResolvedValue(row);
      expect(await usecase.execute(input)).toMatchObject({
        status: "invalid",
        errors: [{ code: "RF_DOCUMENT_NOT_FOUND" }],
      });
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    },
  );
  it.each([0, -1, 0.5, 604801, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid expiry %s before reading",
    async (expiresIn) => {
      expect(await usecase.execute({ ...input, expiresIn })).toMatchObject({ status: "invalid" });
      expect(repository.findById).not.toHaveBeenCalled();
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    },
  );
  it("rejects malformed document IDs", async () => {
    expect(await usecase.execute({ ...input, documentId: "abc" })).toMatchObject({
      status: "invalid",
    });
    expect(repository.findById).not.toHaveBeenCalled();
  });
  it("propagates signing failures", async () => {
    storage.createSignedUrl.mockRejectedValue(new Error("signing failed"));
    await expect(usecase.execute(input)).rejects.toThrow("signing failed");
  });
});
