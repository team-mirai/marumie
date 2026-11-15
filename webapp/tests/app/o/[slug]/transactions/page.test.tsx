jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));

import TransactionsPage from "@/app/o/[slug]/transactions/page";
import { notFound, redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

const redirectMock = jest.mocked(redirect);
const notFoundMock = jest.mocked(notFound);
const loadOrganizationsMock = loadOrganizations as jest.Mock;

describe("TransactionsPage (/o/[slug]/transactions)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadOrganizationsMock.mockResolvedValue({
      default: "team-mirai",
      organizations: [
        { slug: "team-mirai", displayName: "チームみらい" },
        { slug: "sample-party", displayName: "サンプル政党" },
      ],
    });
  });

  it("存在する slug の場合はデフォルト年度の transactions へリダイレクトする", async () => {
    await TransactionsPage({ params: Promise.resolve({ slug: "sample-party" }) });

    expect(redirectMock).toHaveBeenCalledWith("/o/sample-party/2026/transactions");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("存在しない slug の場合は notFound() を呼び出す", async () => {
    await TransactionsPage({ params: Promise.resolve({ slug: "unknown-slug" }) });

    expect(notFoundMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
