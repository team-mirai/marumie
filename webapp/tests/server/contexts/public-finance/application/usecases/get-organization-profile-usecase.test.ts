import { GetOrganizationProfileUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-profile-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

function setup(found: PoliticalOrganization | null) {
  const repository = {
    findBySlug: jest.fn().mockResolvedValue(found),
  } as unknown as IPoliticalOrganizationRepository;
  return new GetOrganizationProfileUsecase(repository);
}

describe("GetOrganizationProfileUsecase", () => {
  it("公式サイト・SNS と写真の版を返す（写真のキーそのものは返さない）", async () => {
    const usecase = setup({
      id: "1",
      displayName: "安野貴博の政治団体",
      orgName: "デジタル民主主義を考える会",
      slug: "digimin",
      description: null,
      websiteUrl: "https://example.com/",
      snsUrls: ["https://x.com/example"],
      photoPath: "political-organizations/1/abc.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(usecase.execute("digimin")).resolves.toEqual({
      websiteUrl: "https://example.com/",
      snsUrls: ["https://x.com/example"],
      photoVersion: "abc",
    });
  });

  it("団体が無ければ null", async () => {
    await expect(setup(null).execute("unknown")).resolves.toBeNull();
  });
});
