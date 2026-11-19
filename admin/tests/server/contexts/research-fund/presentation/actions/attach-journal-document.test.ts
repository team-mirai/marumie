import { revalidatePath } from "next/cache";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { AttachJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import { attachJournalDocument } from "@/server/contexts/research-fund/presentation/actions/attach-journal-document";
import { notifyDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({
  requireResearchFundWriter: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-document-masking", () => ({
  notifyDocumentMasking: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase");
jest.mock("@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository");
jest.mock("@/server/contexts/research-fund/infrastructure/storage/build-document-storage", () => ({
  buildDocumentStorage: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));

const execute = jest.mocked(AttachJournalDocumentUsecase.prototype.execute);

const pdf = { uploadKey: "uploads/2/user/9d0b7a52-3a8e-4f0e-9a51-1f2b3c4d5e6f", originalFilename: "領収書.pdf" };

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

test("ブラウザが置いた書類のキーを、ユーザーと議員とともに usecase に渡し、公開用の版の作成を依頼してレイアウトを再検証する", async () => {
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", pdf),
  ).resolves.toEqual({ success: true });
  expect(requireResearchFundWriter).toHaveBeenCalledWith("2");
  expect(execute).toHaveBeenCalledWith("1", "9", "2026-08-01T00:00:00.000Z", pdf, {
    politicianId: "2",
    userId: "user",
  });
  expect(notifyDocumentMasking).toHaveBeenCalledTimes(1);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});

test("担当外の議員室の仕訳には紐づけない（#1773 の書き込み制限）", async () => {
  jest
    .mocked(requireResearchFundWriter)
    .mockRejectedValue(new AuthError("INSUFFICIENT_PERMISSION", "担当外の議員室のため閲覧のみです"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", pdf),
  ).rejects.toThrow("担当外の議員室のため閲覧のみです");
  expect(execute).not.toHaveBeenCalled();
});

test("対象帳簿が選び直しになったら紐づけない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", pdf),
  ).resolves.toEqual({ success: false, error: "現在の対象帳簿を選択し直してください" });
  expect(execute).not.toHaveBeenCalled();
});

test("ファイルが無ければ紐づけない", async () => {
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", { uploadKey: "", originalFilename: "" }),
  ).resolves.toEqual({ success: false, error: "領収書を選んでください" });
  expect(execute).not.toHaveBeenCalled();
});

test("業務上の拒否は理由を返し、それ以外は汎用のエラーにする", async () => {
  execute.mockRejectedValueOnce(new JournalReviewError("公開中の仕訳には領収書を紐づけられません"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", pdf),
  ).resolves.toEqual({ success: false, error: "公開中の仕訳には領収書を紐づけられません" });
  execute.mockRejectedValueOnce(new Error("storage down"));
  await expect(
    attachJournalDocument("2", "1", "9", "2026-08-01T00:00:00.000Z", pdf),
  ).resolves.toEqual({
    success: false,
    error: "領収書の紐づけに失敗しました。時間をおいて再度お試しください",
  });
  expect(notifyDocumentMasking).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});
