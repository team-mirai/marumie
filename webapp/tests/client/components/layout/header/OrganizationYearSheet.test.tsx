jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(),
}));

import React from "react";
import { usePathname } from "next/navigation";
import OrganizationYearSheet from "@/client/components/layout/header/OrganizationYearSheet";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { OrganizationsResponse } from "@/types/organization";

const usePathnameMock = jest.mocked(usePathname);

const mockOrganizations: OrganizationsResponse = {
  default: "team-mirai",
  organizations: [
    { slug: "team-mirai", displayName: "チームみらい", orgName: "チームみらい本部" },
    { slug: "other-party", displayName: "他党", orgName: null },
  ],
};

const mockPoliticiansByYear: Record<number, ResearchFundPoliticianEntry[]> = {
  2026: [
    { slug: "sample-taro", name: "サンプル太郎", statusLabel: "2026年公開中" },
  ],
  2025: [],
};

describe("OrganizationYearSheet", () => {
  let capturedEffect: (() => void) | null = null;
  let capturedDeps: React.DependencyList | undefined = undefined;
  const setCurrentSlugMock = jest.fn();
  const setCurrentPoliticianSlugMock = jest.fn();
  const setCurrentYearMock = jest.fn();
  let stateIndex = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedEffect = null;
    capturedDeps = undefined;
    stateIndex = 0;

    jest.spyOn(React, "useEffect").mockImplementation((effect, deps) => {
      capturedEffect = effect as () => void;
      capturedDeps = deps;
    });

    (jest.spyOn(React, "useState") as jest.SpyInstance).mockImplementation(
      (init?: unknown) => {
        stateIndex += 1;
        if (stateIndex === 1) return [false, jest.fn()]; // isOpen
        if (stateIndex === 2) return [init, setCurrentSlugMock]; // currentSlug
        if (stateIndex === 3) return [init, setCurrentPoliticianSlugMock]; // currentPoliticianSlug
        if (stateIndex === 4) return [init, setCurrentYearMock]; // currentYear
        return [init, jest.fn()];
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function runEffectWith(pathname: string) {
    usePathnameMock.mockReturnValue(pathname);
    stateIndex = 0;
    OrganizationYearSheet({
      organizations: mockOrganizations,
      politiciansByYear: mockPoliticiansByYear,
    });
    capturedEffect?.();
  }

  it("存在する組織スラッグで currentSlug が正しくセットされること", () => {
    runEffectWith("/o/team-mirai/2026");

    expect(setCurrentSlugMock).toHaveBeenCalledWith("team-mirai");
    expect(setCurrentPoliticianSlugMock).toHaveBeenCalledWith("");
    expect(setCurrentYearMock).toHaveBeenCalledWith(2026);
    expect(capturedDeps).toEqual(["/o/team-mirai/2026", mockOrganizations, mockPoliticiansByYear]);
  });

  it("存在しない組織スラッグで currentSlug が default 組織にフォールバックすること", () => {
    runEffectWith("/o/unknown-org/2026");

    expect(setCurrentSlugMock).toHaveBeenCalledWith("team-mirai");
    expect(setCurrentPoliticianSlugMock).toHaveBeenCalledWith("");
    expect(setCurrentYearMock).toHaveBeenCalledWith(2026);
  });

  it("存在する議員スラッグで currentPoliticianSlug が正しくセットされること", () => {
    runEffectWith("/p/sample-taro/2026");

    expect(setCurrentPoliticianSlugMock).toHaveBeenCalledWith("sample-taro");
    expect(setCurrentSlugMock).not.toHaveBeenCalled();
    expect(setCurrentYearMock).toHaveBeenCalledWith(2026);
  });

  it("存在しない議員スラッグで currentPoliticianSlug が空文字、currentSlug が default 組織にフォールバックすること", () => {
    runEffectWith("/p/unknown-politician/2026");

    expect(setCurrentPoliticianSlugMock).toHaveBeenCalledWith("");
    expect(setCurrentSlugMock).toHaveBeenCalledWith("team-mirai");
    expect(setCurrentYearMock).toHaveBeenCalledWith(2026);
  });

  it("/not-found-xyz などのパスで default 組織にフォールバックすること", () => {
    runEffectWith("/not-found-xyz");

    expect(setCurrentPoliticianSlugMock).toHaveBeenCalledWith("");
    expect(setCurrentSlugMock).toHaveBeenCalledWith("team-mirai");
    expect(setCurrentYearMock).toHaveBeenCalledWith(2026);
  });
});
