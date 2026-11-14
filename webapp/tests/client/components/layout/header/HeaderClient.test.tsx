jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const sheetPropsList: any[] = [];
jest.mock("@/client/components/layout/header/OrganizationYearSheet", () => ({
  __esModule: true,
  default: function MockOrganizationYearSheet(props: any) {
    sheetPropsList.push(props);
    return <div data-testid="organization-year-sheet" />;
  },
}));

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "node-html-parser";
import { usePathname } from "next/navigation";
import HeaderClient from "@/client/components/layout/header/HeaderClient";
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

describe("HeaderClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sheetPropsList.length = 0;
  });

  it("存在する組織ページで正しいナビゲーション・ロゴリンク・OrganizationYearSheet の props を設定する", () => {
    usePathnameMock.mockReturnValue("/o/team-mirai/2026");

    const html = renderToStaticMarkup(
      <HeaderClient
        organizations={mockOrganizations}
        politiciansByYear={mockPoliticiansByYear}
        showResearchFundNavigation={true}
      />,
    );

    const root = parse(html);
    const logoLink = root.querySelector("a");
    expect(logoLink?.getAttribute("href")).toBe("/o/team-mirai/2026");

    expect(sheetPropsList).toHaveLength(1);
    expect(sheetPropsList[0]).toMatchObject({
      initialSlug: "team-mirai",
      initialPoliticianSlug: undefined,
      initialYear: 2026,
    });
  });

  it("存在しない組織 slug の場合、default 組織にフォールバックすること", () => {
    usePathnameMock.mockReturnValue("/o/unknown-org/2026");

    const html = renderToStaticMarkup(
      <HeaderClient
        organizations={mockOrganizations}
        politiciansByYear={mockPoliticiansByYear}
        showResearchFundNavigation={true}
      />,
    );

    const root = parse(html);
    const logoLink = root.querySelector("a");
    expect(logoLink?.getAttribute("href")).toBe("/o/team-mirai/2026");

    expect(sheetPropsList).toHaveLength(1);
    expect(sheetPropsList[0]).toMatchObject({
      initialSlug: "team-mirai",
      initialPoliticianSlug: undefined,
      initialYear: 2026,
    });
  });

  it("存在する議員ページで正しい議員ナビゲーション・ロゴリンク・OrganizationYearSheet の props を設定する", () => {
    usePathnameMock.mockReturnValue("/p/sample-taro/2026");

    const html = renderToStaticMarkup(
      <HeaderClient
        organizations={mockOrganizations}
        politiciansByYear={mockPoliticiansByYear}
        showResearchFundNavigation={true}
      />,
    );

    const root = parse(html);
    const logoLink = root.querySelector("a");
    expect(logoLink?.getAttribute("href")).toBe("/p/sample-taro/2026");

    expect(sheetPropsList).toHaveLength(1);
    expect(sheetPropsList[0]).toMatchObject({
      initialSlug: "team-mirai",
      initialPoliticianSlug: "sample-taro",
      initialYear: 2026,
    });
  });

  it("存在しない議員 slug の場合、default 組織にフォールバックすること", () => {
    usePathnameMock.mockReturnValue("/p/unknown-politician/2026");

    const html = renderToStaticMarkup(
      <HeaderClient
        organizations={mockOrganizations}
        politiciansByYear={mockPoliticiansByYear}
        showResearchFundNavigation={true}
      />,
    );

    const root = parse(html);
    const logoLink = root.querySelector("a");
    expect(logoLink?.getAttribute("href")).toBe("/o/team-mirai/2026");

    expect(sheetPropsList).toHaveLength(1);
    expect(sheetPropsList[0]).toMatchObject({
      initialSlug: "team-mirai",
      initialPoliticianSlug: undefined,
      initialYear: 2026,
    });
  });

  it("/not-found-xyz 等の場合、default 組織にフォールバックすること", () => {
    usePathnameMock.mockReturnValue("/not-found-xyz");

    const html = renderToStaticMarkup(
      <HeaderClient
        organizations={mockOrganizations}
        politiciansByYear={mockPoliticiansByYear}
        showResearchFundNavigation={true}
      />,
    );

    const root = parse(html);
    const logoLink = root.querySelector("a");
    expect(logoLink?.getAttribute("href")).toBe("/o/team-mirai/2026");

    expect(sheetPropsList).toHaveLength(1);
    expect(sheetPropsList[0]).toMatchObject({
      initialSlug: "team-mirai",
      initialPoliticianSlug: undefined,
      initialYear: 2026,
    });
  });
});
