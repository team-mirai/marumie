import { revalidatePath } from "next/cache";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { AttachJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { attachJournalDocument } from "@/server/contexts/research-fund/presentation/actions/attach-journal-document";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({
  requireResearchFundWriter: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase");
jest.mock("@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository");
jest.mock("@/server/contexts/research-fund/infrastructure/storage/build-document-storage", () => ({
  buildDocumentStorage: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));

const execute = jest.mocked(AttachJournalDocumentUsecase.prototype.execute);

function formDataWith(file?: File) {
  const formData = new FormData();
  if (file) formData.append("document", file);
  return formData;
}
const pdf = new File([new Uint8Array([1, 2, 3])], "領収書.pdf", { type: "application/pdf" });

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
  execute.mockResolvedValue(undefined);
});

test("ファイルを読み出して usecase に渡し、レイアウトを再検証する", async () => {
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith(pdf)),
  ).resolves.toEqual({ success: true });
  expect(requireResearchFundWriter).toHaveBeenCalledWith("2");
  expect(execute).toHaveBeenCalledWith("1", "9", "2026-08-01T00:00:00.000Z", {
    bytes: new Uint8Array([1, 2, 3]),
    mime: "application/pdf",
    originalFilename: "領収書.pdf",
  });
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});

test("担当外の議員室の仕訳には紐づけない（#1773 の書き込み制限）", async () => {
  jest
    .mocked(requireResearchFundWriter)
    .mockRejectedValue(new AuthError("INSUFFICIENT_PERMISSION", "担当外の議員室のため閲覧のみです"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith(pdf)),
  ).rejects.toThrow("担当外の議員室のため閲覧のみです");
  expect(execute).not.toHaveBeenCalled();
});

test("対象帳簿が選び直しになったら紐づけない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith(pdf)),
  ).resolves.toEqual({ success: false, error: "現在の対象帳簿を選択し直してください" });
  expect(execute).not.toHaveBeenCalled();
});

test("ファイルが無ければ紐づけない", async () => {
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith()),
  ).resolves.toEqual({ success: false, error: "領収書を選んでください" });
  expect(execute).not.toHaveBeenCalled();
});

test("業務上の拒否は理由を返し、それ以外は汎用のエラーにする", async () => {
  execute.mockRejectedValueOnce(new JournalReviewError("公開中の仕訳には領収書を紐づけられません"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith(pdf)),
  ).resolves.toEqual({ success: false, error: "公開中の仕訳には領収書を紐づけられません" });
  execute.mockRejectedValueOnce(new Error("storage down"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", formDataWith(pdf)),
  ).resolves.toEqual({
    success: false,
    error: "領収書の紐づけに失敗しました。時間をおいて再度お試しください",
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});
