import { GetOrganizationProfileUsecase } from "@/server/contexts/report/application/usecases/get-organization-profile-usecase";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

describe("GetOrganizationProfileUsecase", () => {
  const createMockProfile = (
    overrides?: Partial<OrganizationReportProfile>,
  ): OrganizationReportProfile => ({
    id: "1",
    politicalOrganizationId: "100",
    financialYear: 2024,
    officialName: "テスト政治団体",
    officialNameKana: "テストセイジダンタイ",
    officeAddress: "東京都千代田区",
    officeAddressBuilding: "テストビル",
    details: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockRepository = (): jest.Mocked<IOrganizationReportProfileRepository> => ({
    findByOrganizationIdAndYear: jest.fn(),
    getOrganizationSlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  });

  it("指定した団体IDと年度でプロフィールを取得する", async () => {
    const mockRepository = createMockRepository();
    const expectedProfile = createMockProfile();
    mockRepository.findByOrganizationIdAndYear.mockResolvedValue(
      expectedProfile,
    );

    const usecase = new GetOrganizationProfileUsecase(mockRepository);
    const result = await usecase.execute({
      politicalOrganizationId: "100",
      financialYear: 2024,
    });

    expect(mockRepository.findByOrganizationIdAndYear).toHaveBeenCalledWith(
      "100",
      2024,
    );
    expect(result).toEqual(expectedProfile);
  });

  it("プロフィールが存在しない場合、nullを返す", async () => {
    const mockRepository = createMockRepository();
    mockRepository.findByOrganizationIdAndYear.mockResolvedValue(null);

    const usecase = new GetOrganizationProfileUsecase(mockRepository);
    const result = await usecase.execute({
      politicalOrganizationId: "999",
      financialYear: 2024,
    });

    expect(result).toBeNull();
  });

  it("異なる年度のプロフィールを取得できる", async () => {
    const mockRepository = createMockRepository();
    const profile2023 = createMockProfile({ id: "1", financialYear: 2023 });
    const profile2024 = createMockProfile({ id: "2", financialYear: 2024 });

    mockRepository.findByOrganizationIdAndYear
      .mockResolvedValueOnce(profile2023)
      .mockResolvedValueOnce(profile2024);

    const usecase = new GetOrganizationProfileUsecase(mockRepository);

    const result2023 = await usecase.execute({
      politicalOrganizationId: "100",
      financialYear: 2023,
    });
    const result2024 = await usecase.execute({
      politicalOrganizationId: "100",
      financialYear: 2024,
    });

    expect(result2023?.financialYear).toBe(2023);
    expect(result2024?.financialYear).toBe(2024);
  });
});
