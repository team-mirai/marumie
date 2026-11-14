import { GetOrganizationPhotoUrlUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-photo-url-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { IProfilePhotoStorage } from "@/server/contexts/public-finance/domain/repositories/profile-photo-storage.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

const organization = (overrides: Partial<PoliticalOrganization> = {}): PoliticalOrganization => ({
  id: "1",
  displayName: "安野貴博の政治団体",
  orgName: "デジタル民主主義を考える会",
  slug: "digimin",
  description: null,
  websiteUrl: null,
  snsUrls: [],
  photoPath: "political-organizations/1/abc.jpg",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function setup(found: PoliticalOrganization | null) {
  const repository = {
    findBySlug: jest.fn().mockResolvedValue(found),
  } as unknown as IPoliticalOrganizationRepository;
  const storage: IProfilePhotoStorage = {
    createSignedUrl: jest.fn().mockResolvedValue("https://storage.example/signed"),
  };
  return { usecase: new GetOrganizationPhotoUrlUsecase(repository, storage), storage };
}

describe("GetOrganizationPhotoUrlUsecase", () => {
  it("写真のキーの署名URLを短い有効期限で返す", async () => {
    const { usecase, storage } = setup(organization());

    await expect(usecase.execute("digimin")).resolves.toBe("https://storage.example/signed");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("political-organizations/1/abc.jpg", 300);
  });

  it("写真が未登録なら null", async () => {
    const { usecase, storage } = setup(organization({ photoPath: null }));

    await expect(usecase.execute("digimin")).resolves.toBeNull();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("団体が無ければ null", async () => {
    const { usecase } = setup(null);

    await expect(usecase.execute("unknown")).resolves.toBeNull();
  });
});
