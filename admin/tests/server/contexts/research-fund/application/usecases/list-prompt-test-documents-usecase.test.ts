import {
  ListPromptTestDocumentsUsecase,
  PROMPT_TEST_DOCUMENT_LIMIT,
} from "@/server/contexts/research-fund/application/usecases/list-prompt-test-documents-usecase";
import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";

const DOCUMENT: ResearchFundDocument = {
  id: "42",
  bookId: "12",
  storageKey: "key-1",
  mime: "image/jpeg",
  originalFilename: "IMG_1.jpg",
  createdAt: new Date("2026-04-01T00:00:00Z"),
};

describe("ListPromptTestDocumentsUsecase", () => {
  const documentRepository: jest.Mocked<DocumentRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listByBook: jest.fn(),
  };
  const usecase = new ListPromptTestDocumentsUsecase(documentRepository);

  beforeEach(() => jest.resetAllMocks());

  it("returns the book's documents for the select", async () => {
    documentRepository.listByBook.mockResolvedValue([DOCUMENT]);

    await expect(usecase.execute("12")).resolves.toEqual([
      { id: "42", originalFilename: "IMG_1.jpg", mime: "image/jpeg" },
    ]);
    expect(documentRepository.listByBook).toHaveBeenCalledWith("12", PROMPT_TEST_DOCUMENT_LIMIT);
  });

  it("rejects an invalid book id", async () => {
    await expect(usecase.execute("0")).rejects.toThrow("有効なIDを指定してください");
    expect(documentRepository.listByBook).not.toHaveBeenCalled();
  });
});
