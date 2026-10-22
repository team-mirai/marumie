import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { PrepareDocumentUploadsUsecase } from "@/server/contexts/research-fund/application/usecases/prepare-document-uploads-usecase";
import { prepareDocumentUploads } from "@/server/contexts/research-fund/presentation/actions/prepare-document-uploads";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({
  requireResearchFundWriter: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/application/usecases/prepare-document-uploads-usecase");
jest.mock("@/server/contexts/research-fund/infrastructure/storage/build-document-storage", () => ({
  buildDocumentStorage: jest.fn(),
}));

const execute = jest.mocked(PrepareDocumentUploadsUsecase.prototype.execute);
const files = [{ mime: "application/pdf", size: 16_500_000 }];

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(requireResearchFundWriter)
    .mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireResearchFundWriter>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({
    kind: "research-fund",
    key: "book:1",
    name: "議員",
    year: 2026,
    politicianId: "2",
    bookId: "1",
    draftCount: 0,
  });
  execute.mockResolvedValue({
    status: "valid",
    value: [{ uploadKey: "uploads/2/user/x", uploadUrl: "https://storage.example/x" }],
  });
});

test("担当のユーザーに、ユーザーと議員に結びついたアップロード先を返す", async () => {
  await expect(prepareDocumentUploads("2", "1", files)).resolves.toEqual({
    success: true,
    targets: [{ uploadKey: "uploads/2/user/x", uploadUrl: "https://storage.example/x" }],
  });
  expect(requireResearchFundWriter).toHaveBeenCalledWith("2");
  expect(execute).toHaveBeenCalledWith({ owner: { politicianId: "2", userId: "user" }, files });
});

test("担当外の議員室にはアップロード先を発行しない（#1773 の書き込み制限）", async () => {
  jest
    .mocked(requireResearchFundWriter)
    .mockRejectedValue(new AuthError("INSUFFICIENT_PERMISSION", "担当外の議員室のため閲覧のみです"));
  await expect(prepareDocumentUploads("2", "1", files)).rejects.toThrow("担当外");
  expect(execute).not.toHaveBeenCalled();
});

test("対象帳簿が選び直しになったら発行しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  await expect(prepareDocumentUploads("2", "1", files)).resolves.toEqual({
    success: false,
    error: "現在の対象帳簿を選択し直してください",
  });
  expect(execute).not.toHaveBeenCalled();
});

test("検証の理由はそのまま返し、内部エラーは漏らさない", async () => {
  execute.mockResolvedValueOnce({
    status: "invalid",
    errors: [{ path: "documents", code: "RF_INVALID_DOCUMENT", message: "1ファイル20MBまでです", severity: "error" }],
  });
  await expect(prepareDocumentUploads("2", "1", files)).resolves.toEqual({
    success: false,
    error: "1ファイル20MBまでです",
  });
  jest.spyOn(console, "error").mockImplementation(() => {});
  execute.mockRejectedValueOnce(new Error("bucket secret"));
  await expect(prepareDocumentUploads("2", "1", files)).resolves.toEqual({
    success: false,
    error: "書類のアップロードの準備に失敗しました。時間をおいて再度お試しください",
  });
});
