import { PrepareDocumentUploadsUsecase } from "@/server/contexts/research-fund/application/usecases/prepare-document-uploads-usecase";
import type { DocumentUploadStorage } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";

describe("PrepareDocumentUploadsUsecase", () => {
  const storage: jest.Mocked<DocumentUploadStorage> = {
    createUploadTarget: jest.fn(),
    claimUpload: jest.fn(),
  };
  const usecase = new PrepareDocumentUploadsUsecase(storage);
  const owner = { politicianId: "2", userId: "user-1" };

  beforeEach(() => {
    jest.resetAllMocks();
    let count = 0;
    storage.createUploadTarget.mockImplementation(async (prefix) => {
      count += 1;
      return { uploadKey: `${prefix}${count}`, uploadUrl: `https://storage.example/${count}` };
    });
  });

  it("issues one target per file under the owner's prefix, including scans over 4.5MB", async () => {
    expect(
      await usecase.execute({
        owner,
        files: [
          { mime: "application/pdf", size: 16_500_000 },
          { mime: "image/jpeg", size: 1000 },
        ],
      }),
    ).toEqual({
      status: "valid",
      value: [
        { uploadKey: "uploads/2/user-1/1", uploadUrl: "https://storage.example/1" },
        { uploadKey: "uploads/2/user-1/2", uploadUrl: "https://storage.example/2" },
      ],
    });
    expect(storage.createUploadTarget).toHaveBeenCalledWith("uploads/2/user-1/");
  });

  it.each([
    ["over the size limit", [{ mime: "application/pdf", size: 20 * 1024 * 1024 + 1 }], "1ファイル20MBまでです"],
    ["an unsupported format", [{ mime: "image/gif", size: 10 }], "JPG・PNG・PDFのみアップロードできます"],
    ["no files", [], "書類を1枚以上選んでください"],
    [
      "too many files",
      Array.from({ length: 31 }, () => ({ mime: "image/png", size: 10 })),
      "1回にアップロードできるのは30枚までです",
    ],
  ])("rejects %s without issuing URLs", async (_, files, message) => {
    expect(await usecase.execute({ owner, files })).toMatchObject({
      status: "invalid",
      errors: [{ message }],
    });
    expect(storage.createUploadTarget).not.toHaveBeenCalled();
  });
});
