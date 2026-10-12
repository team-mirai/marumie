import { notFound } from "next/navigation";
import { GetPayeeDetailUsecase } from "@/server/contexts/research-fund/application/usecases/get-payee-detail-usecase";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { loadPayeeDetail } from "@/server/contexts/research-fund/presentation/loaders/load-payee-detail";
jest.mock("next/navigation", () => ({ notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const target = { kind: "research-fund" as const, key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 };
const payee = { id: "7", politicianId: "2", name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
afterEach(() => jest.restoreAllMocks());
test("選択中の帳簿の議員の支払先と、帳簿で紐づいた仕訳を返す", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  const get = jest.spyOn(GetPayeeDetailUsecase.prototype, "execute").mockResolvedValue({ payee, entries: [] });
  await expect(loadPayeeDetail("2", "1", "7")).resolves.toEqual({ payee, entries: [], target });
  expect(get).toHaveBeenCalledWith("2", "1", "7");
});
test("別の議員の支払先・存在しない支払先なら 404 にする", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(target);
  jest.spyOn(GetPayeeDetailUsecase.prototype, "execute").mockResolvedValue(null);
  await expect(loadPayeeDetail("2", "1", "999")).rejects.toThrow("NOT_FOUND");
  expect(notFound).toHaveBeenCalled();
});
test("選択中の対象と一致しなければ支払先を取得しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const get = jest.spyOn(GetPayeeDetailUsecase.prototype, "execute");
  await expect(loadPayeeDetail("3", "1", "7")).rejects.toThrow("NOT_FOUND");
  expect(get).not.toHaveBeenCalled();
});
