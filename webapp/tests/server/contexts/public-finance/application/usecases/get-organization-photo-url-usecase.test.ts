import { GetOrganizationPhotoUrlUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-photo-url-usecase";
import type { IOrganizationPhotoStorage } from "@/server/contexts/public-finance/domain/repositories/organization-photo-storage.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

describe("GetOrganizationPhotoUrlUsecase", () => {
  const organizationRepository = {
    findBySlug: jest.fn(),
  } as unknown as jest.Mocked<IPoliticalOrganizationRepository>;
  const storage: jest.Mocked<IOrganizationPhotoStorage> = {
    createSignedUrl: jest.fn(),
  };
  const usecase = new GetOrganizationPhotoUrlUsecase(organizationRepository, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    storage.createSignedUrl.mockResolvedValue("https://storage.example/signed");
  });

  it("写真が登録されていれば署名URLを返す", async () => {
    organizationRepository.findBySlug.mockResolvedValue({
      photoPath: "political-organizations/2/photo.jpg",
    } as Awaited<ReturnType<IPoliticalOrganizationRepository["findBySlug"]>>);

    await expect(usecase.execute("sample-group")).resolves.toBe("https://storage.example/signed");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("political-organizations/2/photo.jpg", 60);
  });

  it("写真が未登録なら null を返す", async () => {
    organizationRepository.findBySlug.mockResolvedValue({
      photoPath: null,
    } as Awaited<ReturnType<IPoliticalOrganizationRepository["findBySlug"]>>);

    await expect(usecase.execute("sample-group")).resolves.toBeNull();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("団体が無ければ null を返す", async () => {
    organizationRepository.findBySlug.mockResolvedValue(null);

    await expect(usecase.execute("no-such-org")).resolves.toBeNull();
  });
});
