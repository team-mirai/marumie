import { GetHomeOrganizationCardsUsecase } from "@/server/contexts/public-finance/application/usecases/get-home-organization-cards-usecase";
import type { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { SankeyData } from "@/server/contexts/shared/domain/models/sankey-data";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

const createOrganization = (overrides: Partial<PoliticalOrganization>): PoliticalOrganization => ({
  id: "1",
  displayName: "サンプル党",
  orgName: null,
  slug: "sample-party",
  description: null,
  websiteUrl: null,
  snsUrls: [],
  photoPath: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const sankeyFor = (label: string): SankeyData => ({
  nodes: [{ id: label, label }],
  links: [],
});

describe("GetHomeOrganizationCardsUsecase", () => {
  const organizationRepository = {
    findAll: jest.fn(),
    findTypeCodesByIds: jest.fn(),
  } as unknown as jest.Mocked<IPoliticalOrganizationRepository>;
  const transactionRepository = {
    getLastUpdatedAt: jest.fn(),
  } as unknown as jest.Mocked<ITransactionRepository>;
  const sankeyUsecase = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<GetSankeyAggregationUsecase>;

  const usecase = new GetHomeOrganizationCardsUsecase(
    organizationRepository,
    transactionRepository,
    sankeyUsecase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    organizationRepository.findAll.mockResolvedValue([
      createOrganization({ id: "1", slug: "sample-party", displayName: "サンプル党" }),
      createOrganization({
        id: "2",
        slug: "sample-group",
        displayName: "サンプル会",
        orgName: "サンプルを考える会",
        photoPath: "political-organizations/2/photo.jpg",
      }),
    ]);
    organizationRepository.findTypeCodesByIds.mockResolvedValue(new Map([["1", ["01"]]]));
    transactionRepository.getLastUpdatedAt.mockResolvedValue(new Date("2026-10-23T00:00:00Z"));
    sankeyUsecase.execute.mockImplementation(async ({ slugs, financialYear, categoryType }) => ({
      sankeyData: sankeyFor(`${slugs[0]}-${financialYear}-${categoryType}`),
    }));
  });

  it("政治団体区分が政党の団体を政党に、それ以外を政治団体に振り分ける", async () => {
    const result = await usecase.execute({ years: [2025, 2026], photoStorageAvailable: true });

    expect(result.parties.map((card) => card.slug)).toEqual(["sample-party"]);
    expect(result.groups.map((card) => card.slug)).toEqual(["sample-group"]);
    expect(result.groups[0]).toMatchObject({
      displayName: "サンプル会",
      orgName: "サンプルを考える会",
    });
    expect(result.lastUpdatedAt).toBe("2026-10-23T00:00:00.000Z");
  });

  it("年ごとに、法律上の区分と詳細の区分の収支の流れを持つ", async () => {
    const result = await usecase.execute({ years: [2025, 2026], photoStorageAvailable: true });

    expect(result.parties[0].years).toEqual([
      {
        year: 2025,
        political: sankeyFor("sample-party-2025-political-category"),
        friendly: sankeyFor("sample-party-2025-friendly-category"),
      },
      {
        year: 2026,
        political: sankeyFor("sample-party-2026-political-category"),
        friendly: sankeyFor("sample-party-2026-friendly-category"),
      },
    ]);
  });

  it("写真は登録済みで、ストレージが使える環境のときだけ出す", async () => {
    const available = await usecase.execute({ years: [2026], photoStorageAvailable: true });
    expect(available.parties[0].hasPhoto).toBe(false);
    expect(available.groups[0].hasPhoto).toBe(true);

    const unavailable = await usecase.execute({ years: [2026], photoStorageAvailable: false });
    expect(unavailable.groups[0].hasPhoto).toBe(false);
  });

  it("収支の流れの取得に失敗した年は null にし、ほかの年・団体は出す", async () => {
    sankeyUsecase.execute.mockImplementation(async ({ slugs, financialYear, categoryType }) => {
      if (slugs[0] === "sample-party" && financialYear === 2025) throw new Error("boom");
      return { sankeyData: sankeyFor(`${slugs[0]}-${financialYear}-${categoryType}`) };
    });

    const result = await usecase.execute({ years: [2025, 2026], photoStorageAvailable: true });

    expect(result.parties[0].years[0]).toEqual({ year: 2025, political: null, friendly: null });
    expect(result.parties[0].years[1].friendly).not.toBeNull();
    expect(result.groups[0].years[0].friendly).not.toBeNull();
  });
});
