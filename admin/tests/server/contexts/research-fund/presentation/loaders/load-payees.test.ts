import { notFound } from "next/navigation";
import { ListPayeesUsecase } from "@/server/contexts/research-fund/application/usecases/list-payees-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadPayees } from "@/server/contexts/research-fund/presentation/loaders/load-payees";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const target = { kind: "research-fund" as const, key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 };
afterEach(() => jest.restoreAllMocks());
test("選択中の帳簿の議員の支払先を返す", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  const list = jest.spyOn(ListPayeesUsecase.prototype, "execute").mockResolvedValue([]);
  await expect(loadPayees("2", "1")).resolves.toEqual({ payees: [], target });
  expect(list).toHaveBeenCalledWith("2");
});
test("選択中の対象と一致しなければ支払先を取得しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const list = jest.spyOn(ListPayeesUsecase.prototype, "execute");
  await expect(loadPayees("3", "1")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
});
