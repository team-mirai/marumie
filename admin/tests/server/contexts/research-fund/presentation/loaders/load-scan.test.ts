import { notFound } from "next/navigation";
import { ManageScanUsecase } from "@/server/contexts/research-fund/application/usecases/manage-scan-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildScanUsecase, loadScan } from "@/server/contexts/research-fund/presentation/loaders/load-scan";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({
  requireJournalTarget: jest.fn(),
}));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn(() => ({ storage: {} })) }));

const target: Extract<AdminTarget, { kind: "research-fund" }> = {
  kind: "research-fund",
  key: "book:1",
  name: "議員",
  year: 2026,
  politicianId: "2",
  bookId: "1",
  draftCount: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(process, "env", {
    ...process.env,
    SUPABASE_URL: "https://storage.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
  });
});
afterEach(() => jest.restoreAllMocks());

test("対象が一致しなければバッチを取得しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const list = jest.spyOn(ManageScanUsecase.prototype, "list");
  await expect(loadScan("2", "1")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
});

test("プロンプトは議員ごと・バッチは帳簿ごとに引き、現在の対象を添えて返す", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  const data = { batches: [], activePromptVersion: 3, model: "claude-sonnet-5" };
  const list = jest.spyOn(ManageScanUsecase.prototype, "list").mockResolvedValue(data);
  await expect(loadScan("2", "1")).resolves.toEqual({ ...data, target });
  expect(list).toHaveBeenCalledWith("2", "1");
});

test.each(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])("%s がなければ組み立てない", (key) => {
  jest.replaceProperty(process, "env", { ...process.env, [key]: "" });
  expect(() => buildScanUsecase()).toThrow("領収書ストレージが未設定です");
});

test("バケット名は未設定でも既定の private-receipts を使う", () => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    SUPABASE_URL: "https://storage.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-key",
    RESEARCH_FUND_DOCUMENT_BUCKET: "",
  });
  expect(() => buildScanUsecase()).not.toThrow();
});
