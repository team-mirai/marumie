import { notFound } from "next/navigation";
import { ManageGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-grants-usecase";
import { loadGrants } from "@/server/contexts/research-fund/presentation/loaders/load-grants";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const target = { kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 } as const;
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test("対象が一致しなければ支給の予定を取得しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const list = jest.spyOn(ManageGrantsUsecase.prototype, "list");
  await expect(loadGrants("2", "1")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
});

test("一致した帳簿の支給予定と現在の対象を返す", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  const data = { grants: [], termStart: "2026-02-08", financialYear: 2026 };
  const list = jest.spyOn(ManageGrantsUsecase.prototype, "list").mockResolvedValue(data);
  await expect(loadGrants("2", "1")).resolves.toEqual({ ...data, target });
  expect(list).toHaveBeenCalledWith("1");
});
