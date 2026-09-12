import { RegisterDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/register-document-usecase";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";

describe("RegisterDocumentUsecase", () => {
  const repository: jest.Mocked<DocumentRepository> = { create: jest.fn(), findById: jest.fn() };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const usecase = new RegisterDocumentUsecase(repository, storage);
  const input = {
    bookId: "12",
    bytes: new Uint8Array([1, 2]),
    mime: "image/jpeg",
    originalFilename: "領収書.jpg",
  };
  beforeEach(() => {
    jest.resetAllMocks();
    storage.upload.mockResolvedValue({ status: "valid", value: "opaque-key" });
  });
  it.each(["image/jpeg", "image/png", "application/pdf"])(
    "registers %s with its book and original name",
    async (mime) => {
      const document = {
        id: "3",
        bookId: "12",
        storageKey: "opaque-key",
        mime,
        originalFilename: input.originalFilename,
        createdAt: new Date(),
      };
      repository.create.mockResolvedValue(document);
      expect(await usecase.execute({ ...input, mime })).toEqual({
        status: "valid",
        value: document,
      });
      expect(storage.upload).toHaveBeenCalledWith(input.bytes, mime);
      expect(repository.create).toHaveBeenCalledWith({
        bookId: "12",
        storageKey: "opaque-key",
        mime,
        originalFilename: input.originalFilename,
      });
      expect(storage.remove).not.toHaveBeenCalled();
    },
  );
  it.each([
    { mime: "image/svg+xml" },
    { mime: "text/plain" },
    { bytes: new Uint8Array() },
    { originalFilename: " " },
    { originalFilename: "a".repeat(256) },
    { bookId: "../12" },
    { bookId: "0" },
    { bookId: "9223372036854775808" },
  ])("rejects invalid input before external writes: %j", async (override) => {
    expect(await usecase.execute({ ...input, ...override })).toMatchObject({
      status: "invalid",
      errors: [{ code: "RF_INVALID_DOCUMENT" }],
    });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("does not register a failed upload", async () => {
    storage.upload.mockRejectedValue(new Error("upload failed"));
    await expect(usecase.execute(input)).rejects.toThrow("upload failed");
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("propagates storage validation errors", async () => {
    const invalid = {
      status: "invalid" as const,
      errors: [
        {
          path: "document",
          code: "RF_INVALID_DOCUMENT" as const,
          message: "invalid",
          severity: "error" as const,
        },
      ],
    };
    storage.upload.mockResolvedValue(invalid);
    expect(await usecase.execute(input)).toEqual(invalid);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("removes the uploaded object if database registration fails", async () => {
    repository.create.mockRejectedValue(new Error("database failed"));
    await expect(usecase.execute(input)).rejects.toThrow("database failed");
    expect(storage.remove).toHaveBeenCalledWith("opaque-key");
  });
  it("preserves both errors when cleanup also fails", async () => {
    const database = new Error("database failed");
    const cleanup = new Error("cleanup failed");
    repository.create.mockRejectedValue(database);
    storage.remove.mockRejectedValue(cleanup);
    await expect(usecase.execute(input)).rejects.toMatchObject({ errors: [database, cleanup] });
  });
});
