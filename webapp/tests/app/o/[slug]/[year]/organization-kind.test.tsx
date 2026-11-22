jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organizations", () => ({
  loadOrganizations: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-top-page-data", () => ({
  loadTopPageData: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-profile", () => ({
  loadOrganizationProfile: jest.fn(),
}));
jest.mock("@/server/contexts/public-finance/presentation/loaders/load-organization-photo-url", () => ({
  loadOrganizationPhotoUrl: jest.fn(),
}));
jest.mock("@/app/_og-image/render-finance-og-image", () => ({
  ...jest.requireActual("@/app/_og-image/render-finance-og-image"),
  renderFinanceOgImage: jest.fn(),
}));
// 描画はしないので、重い UI ライブラリを読み込む子コンポーネントは差し替える。
function mockComponent(name: string) {
  const component = () => null;
  Object.defineProperty(component, "name", { value: name });
  return { __esModule: true, default: component };
}
jest.mock("@/client/components/common/SiteBottomBlock", () => mockComponent("SiteBottomBlock"));
jest.mock("@/client/components/common/TransparencySection", () =>
  mockComponent("TransparencySection"),
);
jest.mock("@/client/components/layout/Breadcrumbs", () => mockComponent("Breadcrumbs"));
jest.mock("@/client/components/layout/RevealOnScroll", () => mockComponent("RevealOnScroll"));
jest.mock("@/client/components/top-page/BalanceSheetSection", () =>
  mockComponent("BalanceSheetSection"),
);
jest.mock("@/client/components/top-page/MonthlyTrendsSection", () =>
  mockComponent("MonthlyTrendsSection"),
);
jest.mock("@/client/components/top-page/OrganizationCashFlowSection", () =>
  mockComponent("OrganizationCashFlowSection"),
);
jest.mock("@/client/components/top-page/OrganizationHeadingSection", () =>
  mockComponent("OrganizationHeadingSection"),
);
jest.mock("@/client/components/top-page/PartyHeadingSection", () =>
  mockComponent("PartyHeadingSection"),
);
jest.mock("@/client/components/top-page/TransactionsSection", () =>
  mockComponent("TransactionsSection"),
);

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import OrgPage from "@/app/o/[slug]/[year]/page";
import { GET as getOgImage } from "@/app/o/[slug]/[year]/og-image/route";
import { renderFinanceOgImage } from "@/app/_og-image/render-finance-og-image";
import { buildOrganizationMenuItems } from "@/client/lib/header-navigation";
import { GetHomeOrganizationCardsUsecase } from "@/server/contexts/public-finance/application/usecases/get-home-organization-cards-usecase";
import { GetOrganizationsUsecase } from "@/server/contexts/public-finance/application/usecases/get-organizations-usecase";
import type { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import { loadOrganizationProfile } from "@/server/contexts/public-finance/presentation/loaders/load-organization-profile";
import { loadOrganizations } from "@/server/contexts/public-finance/presentation/loaders/load-organizations";
import { loadTopPageData } from "@/server/contexts/public-finance/presentation/loaders/load-top-page-data";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

const loadOrganizationsMock = loadOrganizations as jest.Mock;
const loadTopPageDataMock = loadTopPageData as jest.Mock;
const loadOrganizationProfileMock = loadOrganizationProfile as jest.Mock;
const renderMock = renderFinanceOgImage as jest.Mock;

const friendly = { nodes: [], links: [] };

const createOrganization = (overrides: Partial<PoliticalOrganization>): PoliticalOrganization => ({
  id: "1",
  displayName: "",
  orgName: null,
  slug: "",
  description: null,
  websiteUrl: null,
  snsUrls: [],
  photoPath: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** コードのどこにも名前が出てこない団体。政治団体区分だけで政党かどうかが決まる */
const organizations = [
  createOrganization({ id: "1", slug: "new-party-branch", displayName: "新しい支部" }),
  createOrganization({ id: "2", slug: "new-group", displayName: "新しい会" }),
];
// 1 は政党の支部（02）、2 は政党以外の区分（04）
const typeCodesById = new Map([
  ["1", ["02"]],
  ["2", ["04"]],
]);

const organizationRepository = {
  findAll: async () => organizations,
  findTypeCodesByIds: async () => typeCodesById,
} as unknown as IPoliticalOrganizationRepository;

function flatten(node: ReactNode): string[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (typeof child.type === "function") return [child.type.name];
    return flatten(child.props.children);
  });
}

async function headingOf(slug: string) {
  const page = (await OrgPage({
    params: Promise.resolve({ slug, year: "2026" }),
  })) as ReactElement<{ children: ReactNode }>;
  return flatten(page.props.children).find((name) => name.endsWith("HeadingSection"));
}

async function ogVariantOf(slug: string) {
  renderMock.mockClear();
  await getOgImage(new Request(`http://localhost/o/${slug}/2026/og-image`), {
    params: Promise.resolve({ slug, year: "2026" }),
  });
  return renderMock.mock.calls[0]?.[0]?.variant;
}

describe("政治団体区分が政党の団体を追加したとき", () => {
  beforeEach(async () => {
    const organizationsResponse = await new GetOrganizationsUsecase(organizationRepository).execute({
      photoStorageAvailable: false,
    });
    loadOrganizationsMock.mockResolvedValue(organizationsResponse);
    loadTopPageDataMock.mockResolvedValue({ friendly });
    loadOrganizationProfileMock.mockResolvedValue(null);
    renderMock.mockResolvedValue(new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47])));
  });

  it("トップページのカードで政党に並ぶ", async () => {
    const usecase = new GetHomeOrganizationCardsUsecase(
      organizationRepository,
      { getLastUpdatedAt: async () => null } as unknown as ITransactionRepository,
      {
        execute: async () => ({ sankeyData: friendly }),
      } as unknown as GetSankeyAggregationUsecase,
    );

    const { parties, groups } = await usecase.execute({ years: [2026], photoStorageAvailable: false });

    expect(parties.map((card) => card.slug)).toEqual(["new-party-branch"]);
    expect(groups.map((card) => card.slug)).toEqual(["new-group"]);
  });

  it("メニューで政党として出る", async () => {
    const { organizations: data } = await loadOrganizations();

    const items = buildOrganizationMenuItems(data, { kind: "other" });

    expect(items.map(({ slug, kind }) => ({ slug, kind }))).toEqual([
      { slug: "new-party-branch", kind: "party" },
      { slug: "new-group", kind: "group" },
    ]);
  });

  it("団体のページが政党ページの見せ方になる", async () => {
    expect(await headingOf("new-party-branch")).toBe("PartyHeadingSection");
    expect(await headingOf("new-group")).toBe("OrganizationHeadingSection");
  });

  it("シェア画像が政党の画像になる", async () => {
    expect(await ogVariantOf("new-party-branch")).toBe("party");
    expect(await ogVariantOf("new-group")).toBe("group");
  });
});
