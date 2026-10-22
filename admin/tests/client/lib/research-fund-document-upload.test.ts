import {
  documentFileSizeError,
  uploadResearchFundDocuments,
} from "@/client/lib/research-fund-document-upload";
import { prepareDocumentUploads } from "@/server/contexts/research-fund/presentation/actions/prepare-document-uploads";

jest.mock("@/server/contexts/research-fund/presentation/actions/prepare-document-uploads", () => ({
  prepareDocumentUploads: jest.fn(),
}));

const target = { politicianId: "2", bookId: "1" };

function fileOfSize(name: string, size: number, type = "application/pdf") {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  jest.mocked(prepareDocumentUploads).mockResolvedValue({
    success: true,
    targets: [
      { uploadKey: "uploads/2/u/a", uploadUrl: "https://storage.example/a" },
      { uploadKey: "uploads/2/u/b", uploadUrl: "https://storage.example/b" },
    ],
  });
});

describe("documentFileSizeError", () => {
  it("names the first file over the limit", () => {
    expect(
      documentFileSizeError([fileOfSize("a.pdf", 10), fileOfSize("scan.pdf", 21 * 1024 * 1024)]),
    ).toBe("1ファイル20MBまでです（scan.pdf）");
    expect(documentFileSizeError([fileOfSize("a.pdf", 20 * 1024 * 1024)])).toBeNull();
  });
});

describe("uploadResearchFundDocuments", () => {
  it("puts each file directly to storage and returns only keys and filenames", async () => {
    const files = [fileOfSize("scan.pdf", 16_500_000), fileOfSize("IMG.jpg", 100, "image/jpeg")];
    await expect(uploadResearchFundDocuments(target, files)).resolves.toEqual({
      success: true,
      uploads: [
        { uploadKey: "uploads/2/u/a", originalFilename: "scan.pdf" },
        { uploadKey: "uploads/2/u/b", originalFilename: "IMG.jpg" },
      ],
    });
    expect(prepareDocumentUploads).toHaveBeenCalledWith("2", "1", [
      { mime: "application/pdf", size: 16_500_000 },
      { mime: "image/jpeg", size: 100 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("https://storage.example/a", {
      method: "PUT",
      headers: { "content-type": "application/pdf", "x-upsert": "false" },
      body: files[0],
    });
  });

  it("stops before contacting the server when a file is over the limit", async () => {
    await expect(
      uploadResearchFundDocuments(target, [fileOfSize("scan.pdf", 21 * 1024 * 1024)]),
    ).resolves.toEqual({ success: false, error: "1ファイル20MBまでです（scan.pdf）" });
    expect(prepareDocumentUploads).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes on the server's refusal", async () => {
    jest
      .mocked(prepareDocumentUploads)
      .mockResolvedValue({ success: false, error: "現在の対象帳簿を選択し直してください" });
    await expect(uploadResearchFundDocuments(target, [fileOfSize("a.pdf", 10)])).resolves.toEqual(
      { success: false, error: "現在の対象帳簿を選択し直してください" },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports which file failed to upload", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 413 });
    await expect(
      uploadResearchFundDocuments(target, [fileOfSize("a.pdf", 10), fileOfSize("b.pdf", 10)]),
    ).resolves.toEqual({ success: false, error: "書類のアップロードに失敗しました（b.pdf・413）" });
  });
});
