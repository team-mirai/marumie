import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import type { ProcessScanJobsUsecase } from "@/server/contexts/research-fund/application/usecases/process-scan-jobs-usecase";
import { processScanJobs } from "@/server/contexts/research-fund/presentation/actions/process-scan-jobs";
import { retryScanJob } from "@/server/contexts/research-fund/presentation/actions/retry-scan-job";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildProcessScanJobsUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({
  requireAuth: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-scan", () => ({
  buildProcessScanJobsUsecase: jest.fn(),
}));

const execute = jest.fn();
const retry = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(requireAuth)
    .mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireAuth>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({
    kind: "research-fund",
    key: "book:1",
    name: "議員",
    year: 2026,
    politicianId: "2",
    bookId: "1",
    draftCount: 0,
  });
  jest
    .mocked(buildProcessScanJobsUsecase)
    .mockReturnValue({ execute, retry } as unknown as ProcessScanJobsUsecase);
  execute.mockResolvedValue({ processed: 2, succeeded: 2, failed: 0, hasMore: true });
  retry.mockResolvedValue(true);
});

describe("processScanJobs", () => {
  test("処理した件数と残りの有無を返し、レイアウトを再検証する", async () => {
    await expect(processScanJobs("2", "1")).resolves.toEqual({
      success: true,
      processed: 2,
      succeeded: 2,
      failed: 0,
      hasMore: true,
    });
    expect(execute).toHaveBeenCalledWith({ bookId: "1", userId: "user" });
    expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  });

  test("別の対象への古いフォーム送信を拒否", async () => {
    jest.mocked(requireJournalTarget).mockResolvedValue(null);
    await expect(processScanJobs("2", "1")).resolves.toMatchObject({ success: false });
    expect(execute).not.toHaveBeenCalled();
  });

  test("認証失敗時は処理を始めない", async () => {
    jest.mocked(requireAuth).mockRejectedValueOnce(new Error("auth"));
    await expect(processScanJobs("2", "1")).rejects.toThrow("auth");
    expect(execute).not.toHaveBeenCalled();
  });

  test("内部エラーの詳細は漏らさない", async () => {
    execute.mockRejectedValueOnce(new Error("ANTHROPIC_API_KEY is missing"));
    await expect(processScanJobs("2", "1")).resolves.toEqual({
      success: false,
      error: "読み取りの実行に失敗しました。時間をおいて再度お試しください",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("retryScanJob", () => {
  test("失敗したジョブを待機中に戻し、レイアウトを再検証する", async () => {
    await expect(retryScanJob("2", "1", "11")).resolves.toEqual({ success: true });
    expect(retry).toHaveBeenCalledWith({ bookId: "1", jobId: "11" });
    expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  });

  test("既に処理済みなら再読み込みを促す", async () => {
    retry.mockResolvedValue(false);
    await expect(retryScanJob("2", "1", "11")).resolves.toEqual({
      success: false,
      error: "このジョブは再実行できません。画面を再読み込みしてください",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("別の対象への古いフォーム送信を拒否", async () => {
    jest.mocked(requireJournalTarget).mockResolvedValue(null);
    await expect(retryScanJob("2", "1", "11")).resolves.toMatchObject({ success: false });
    expect(retry).not.toHaveBeenCalled();
  });

  test("内部エラーの詳細は漏らさない", async () => {
    retry.mockRejectedValueOnce(new Error("db detail"));
    await expect(retryScanJob("2", "1", "11")).resolves.toEqual({
      success: false,
      error: "再実行に失敗しました。時間をおいて再度お試しください",
    });
  });
});
