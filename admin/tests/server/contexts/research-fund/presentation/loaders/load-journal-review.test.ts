import { notFound } from "next/navigation";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import { ManageJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/manage-journal-review-usecase";
import { loadJournalReview, requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import type { AdminTarget } from "@/server/contexts/shared/domain/models/admin-target";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/shared/presentation/loaders/load-admin-targets", () => ({ loadAdminTargets: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const target: AdminTarget = { kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 };
function select(currentTarget: AdminTarget | null) {
  jest.mocked(loadAdminTargets).mockResolvedValue({ targets: currentTarget ? [currentTarget] : [], currentTarget, cookieName: "admin-target-user" });
}
afterEach(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());
test.each([null, { ...target, bookId: "9" }, { ...target, politicianId: "9" },
  { kind: "political-organization", key: "org:1", name: "団体", year: 2026, organizationId: "1" } as AdminTarget])("対象が一致しなければ一覧を取得しない: %j", async currentTarget => {
  select(currentTarget);
  const list = jest.spyOn(ManageJournalReviewUsecase.prototype, "list");
  await expect(requireJournalTarget("2", "1")).resolves.toBeNull();
  await expect(loadJournalReview("2", "1")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
});
test("一致した帳簿の一覧と現在の対象を返す", async () => {
  select(target);
  const data = { entries: [], accounts: [] };
  const list = jest.spyOn(ManageJournalReviewUsecase.prototype, "list").mockResolvedValue(data);
  await expect(loadJournalReview("2", "1")).resolves.toEqual({ ...data, target });
  expect(list).toHaveBeenCalledWith("1");
});
test("認証を含む対象取得の失敗時は一覧を取得しない", async () => {
  jest.mocked(loadAdminTargets).mockRejectedValue(new Error("auth"));
  const list = jest.spyOn(ManageJournalReviewUsecase.prototype, "list");
  await expect(loadJournalReview("2", "1")).rejects.toThrow("auth");
  expect(list).not.toHaveBeenCalled();
});
