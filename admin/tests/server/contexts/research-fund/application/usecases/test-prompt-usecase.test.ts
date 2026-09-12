import {
  PROMPT_TEST_DOCUMENT_LIMIT,
  TestPromptUsecase,
} from "@/server/contexts/research-fund/application/usecases/test-prompt-usecase";
import type { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { PromptError } from "@/server/contexts/research-fund/domain/models/prompt";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { ReceiptExtractionGateway } from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import { RF_ERROR_CODES } from "@/server/contexts/research-fund/domain/types/validation";

const DOCUMENT: ResearchFundDocument = {
  id: "42",
  bookId: "12",
  storageKey: "key-1",
  mime: "image/jpeg",
  originalFilename: "IMG_1.jpg",
  createdAt: new Date("2026-04-01T00:00:00Z"),
};

const RECEIPT = {
  date: "2026-04-01",
  items: [
    { item: "タクシー代", amount: 1200, category_key: "taxi", note: null, split_group: null },
  ],
} as const;

describe("TestPromptUsecase", () => {
  const documentRepository: jest.Mocked<DocumentRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    listByBook: jest.fn(),
  };
  const storage: jest.Mocked<DocumentStorage> = {
    upload: jest.fn(),
    download: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
  };
  const gateway: jest.Mocked<ReceiptExtractionGateway> = { extract: jest.fn() };
  const usecase = new TestPromptUsecase(documentRepository, storage, gateway);
  const input = { bookId: "12", documentId: "42", officePrompt: "編集中のプロンプト" };

  beforeEach(() => {
    jest.resetAllMocks();
    documentRepository.findById.mockResolvedValue(DOCUMENT);
    storage.download.mockResolvedValue({ status: "valid", value: new Uint8Array([1, 2]) });
    gateway.extract.mockResolvedValue({
      status: "valid",
      value: { ...RECEIPT, items: [...RECEIPT.items] },
    });
  });

  describe("listDocuments", () => {
    it("returns the book's documents for the select", async () => {
      documentRepository.listByBook.mockResolvedValue([DOCUMENT]);

      await expect(usecase.listDocuments("12")).resolves.toEqual([
        { id: "42", originalFilename: "IMG_1.jpg", mime: "image/jpeg" },
      ]);
      expect(documentRepository.listByBook).toHaveBeenCalledWith("12", PROMPT_TEST_DOCUMENT_LIMIT);
    });

    it("rejects an invalid book id", async () => {
      await expect(usecase.listDocuments("0")).rejects.toThrow("有効なIDを指定してください");
      expect(documentRepository.listByBook).not.toHaveBeenCalled();
    });
  });

  describe("execute", () => {
    it("extracts with the unsaved editor body and returns the JSON", async () => {
      const result = await usecase.execute(input);

      expect(gateway.extract).toHaveBeenCalledWith({
        document: { bytes: new Uint8Array([1, 2]), mime: "image/jpeg" },
        officePrompt: "編集中のプロンプト",
      });
      expect(result).toEqual({
        status: "valid",
        value: expect.objectContaining({ date: "2026-04-01" }),
      });
    });

    it("saves nothing: no journal entries, no job, no raw_json", async () => {
      await usecase.execute(input);

      // 書き込み系の口はこの usecase には渡っていない。読み取りに使う口だけが呼ばれる
      expect(documentRepository.create).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it("rejects an empty prompt body without calling the gateway", async () => {
      await expect(usecase.execute({ ...input, officePrompt: "  " })).rejects.toThrow(PromptError);
      expect(gateway.extract).not.toHaveBeenCalled();
    });

    it("returns an invalid result for a document outside the book", async () => {
      documentRepository.findById.mockResolvedValue(null);

      const result = await usecase.execute(input);

      expect(result).toEqual({
        status: "invalid",
        errors: [expect.objectContaining({ code: RF_ERROR_CODES.DOCUMENT_NOT_FOUND })],
      });
      expect(gateway.extract).not.toHaveBeenCalled();
    });

    it("returns an invalid result for an unreadable mime type", async () => {
      documentRepository.findById.mockResolvedValue({ ...DOCUMENT, mime: "text/plain" });

      const result = await usecase.execute(input);

      expect(result).toEqual({
        status: "invalid",
        errors: [expect.objectContaining({ message: "JPG・PNG・PDFのみ読み取れます" })],
      });
      expect(storage.download).not.toHaveBeenCalled();
    });

    it("returns an invalid id result before touching the repository", async () => {
      const result = await usecase.execute({ ...input, documentId: "abc" });

      expect(result.status).toBe("invalid");
      expect(documentRepository.findById).not.toHaveBeenCalled();
    });

    it("passes the download failure through", async () => {
      storage.download.mockResolvedValue({
        status: "invalid",
        errors: [
          {
            path: "storageKey",
            code: RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
            message: "原本を取得できませんでした",
            severity: "error",
          },
        ],
      });

      const result = await usecase.execute(input);

      expect(result).toEqual({
        status: "invalid",
        errors: [expect.objectContaining({ message: "原本を取得できませんでした" })],
      });
      expect(gateway.extract).not.toHaveBeenCalled();
    });

    it("passes the extraction failure through", async () => {
      gateway.extract.mockResolvedValue({
        status: "invalid",
        errors: [
          {
            path: "",
            code: RF_ERROR_CODES.EXTRACTION_FAILED,
            message: "領収書の読み取りに失敗しました",
            severity: "error",
          },
        ],
      });

      const result = await usecase.execute(input);

      expect(result).toEqual({
        status: "invalid",
        errors: [expect.objectContaining({ code: RF_ERROR_CODES.EXTRACTION_FAILED })],
      });
    });
  });
});
