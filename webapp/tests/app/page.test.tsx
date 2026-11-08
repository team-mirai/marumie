jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));

import HomePage from "@/app/page";
import { notFound, redirect } from "next/navigation";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";

const redirectMock = jest.mocked(redirect);
const notFoundMock = jest.mocked(notFound);
const loadOrganizationsMock = loadOrganizations as jest.Mock;

describe("HomePage (/)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("デフォルト slug が存在する場合、その組織のページへリダイレクトする", async () => {
    loadOrganizationsMock.mockResolvedValue({
      default: "sample-party",
      organizations: [{ slug: "sample-party", displayName: "サンプル政党" }],
    });

    await HomePage();

    expect(redirectMock).toHaveBeenCalledWith("/o/sample-party");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("デフォルト slug が存在しない場合、notFound() を呼び出す", async () => {
    loadOrganizationsMock.mockResolvedValue({
      default: null,
      organizations: [],
    });

    await HomePage();

    expect(notFoundMock).toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
