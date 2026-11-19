import { GetOrganizationsUsecase } from "@/server/contexts/public-finance/application/usecases/get-organizations-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
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

describe("GetOrganizationsUsecase", () => {
  const organizationRepository = {
    findAll: jest.fn(),
    findTypeCodesByIds: jest.fn(),
  } as unknown as jest.Mocked<IPoliticalOrganizationRepository>;

  const usecase = new GetOrganizationsUsecase(organizationRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    organizationRepository.findAll.mockResolvedValue([
      createOrganization({ id: "1", slug: "sample-party", displayName: "サンプル党" }),
      createOrganization({
        id: "2",
        slug: "sample-group",
        displayName: "サンプル会",
        orgName: "サンプルを考える会",
        photoPath: "political-organizations/2/photo.jpg",
      }),
      createOrganization({ id: "3", slug: "no-photo", displayName: "写真なしの会" }),
    ]);
    organizationRepository.findTypeCodesByIds.mockResolvedValue(new Map([["1", ["01"]]]));
  });

  it("政治団体区分から政党かどうかを、顔写真の登録から写真を出せるかを決める", async () => {
    const result = await usecase.execute({ photoStorageAvailable: true });

    expect(organizationRepository.findTypeCodesByIds).toHaveBeenCalledWith(["1", "2", "3"]);
    expect(result).toEqual({
      default: "sample-party",
      organizations: [
        { slug: "sample-party", displayName: "サンプル党", orgName: null, kind: "party", hasPhoto: false },
        {
          slug: "sample-group",
          displayName: "サンプル会",
          orgName: "サンプルを考える会",
          kind: "group",
          hasPhoto: true,
        },
        { slug: "no-photo", displayName: "写真なしの会", orgName: null, kind: "group", hasPhoto: false },
      ],
    });
  });

  it("顔写真のストレージが使えない環境では、登録済みでも写真を出さない", async () => {
    const result = await usecase.execute({ photoStorageAvailable: false });

    expect(result.organizations.every((org) => !org.hasPhoto)).toBe(true);
  });

  it("団体が0件なら区分を引かずに空で返す", async () => {
    organizationRepository.findAll.mockResolvedValue([]);

    const result = await usecase.execute({ photoStorageAvailable: true });

    expect(result).toEqual({ default: null, organizations: [] });
    expect(organizationRepository.findTypeCodesByIds).not.toHaveBeenCalled();
  });
});
