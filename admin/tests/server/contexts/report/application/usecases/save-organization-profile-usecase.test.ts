import { SaveOrganizationProfileUsecase } from "@/server/contexts/report/application/usecases/save-organization-profile-usecase";
import type { IOrganizationReportProfileRepository } from "@/server/contexts/report/domain/repositories/organization-report-profile-repository.interface";
import type { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";

describe("SaveOrganizationProfileUsecase", () => {
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

  describe("新規作成", () => {
    it("idがない場合、createを呼び出す", async () => {
      const mockRepository = createMockRepository();
      const expectedProfile = createMockProfile();
      mockRepository.create.mockResolvedValue(expectedProfile);

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "100",
        financialYear: 2024,
        officialName: "テスト政治団体",
        officialNameKana: "テストセイジダンタイ",
        officeAddress: "東京都千代田区",
        officeAddressBuilding: "テストビル",
        details: {},
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        politicalOrganizationId: "100",
        financialYear: 2024,
        officialName: "テスト政治団体",
        officialNameKana: "テストセイジダンタイ",
        officeAddress: "東京都千代田区",
        officeAddressBuilding: "テストビル",
        details: {},
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, profile: expectedProfile });
    });

    it("detailsにネストしたデータを含めて作成できる", async () => {
      const mockRepository = createMockRepository();
      const details = {
        representative: { lastName: "山田", firstName: "太郎" },
        accountant: { lastName: "鈴木", firstName: "花子" },
        contactPersons: [
          { id: "1", lastName: "田中", firstName: "一郎", tel: "03-1234-5678" },
        ],
        organizationType: "01",
        activityArea: "1" as const,
      };
      const expectedProfile = createMockProfile({ details });
      mockRepository.create.mockResolvedValue(expectedProfile);

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "100",
        financialYear: 2024,
        details,
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ details }),
      );
      expect(result).toEqual({ success: true, profile: expectedProfile });
    });
  });

  describe("更新", () => {
    it("idがある場合、updateを呼び出す", async () => {
      const mockRepository = createMockRepository();
      const expectedProfile = createMockProfile({
        officialName: "更新後の団体名",
      });
      mockRepository.update.mockResolvedValue(expectedProfile);

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        id: "1",
        politicalOrganizationId: "100",
        financialYear: 2024,
        officialName: "更新後の団体名",
      });

      expect(mockRepository.update).toHaveBeenCalledWith("1", {
        officialName: "更新後の団体名",
        officialNameKana: undefined,
        officeAddress: undefined,
        officeAddressBuilding: undefined,
        details: undefined,
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, profile: expectedProfile });
    });

    it("一部のフィールドのみ更新できる", async () => {
      const mockRepository = createMockRepository();
      const expectedProfile = createMockProfile();
      mockRepository.update.mockResolvedValue(expectedProfile);

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      await usecase.execute({
        id: "1",
        politicalOrganizationId: "100",
        financialYear: 2024,
        officeAddress: "新しい住所",
      });

      expect(mockRepository.update).toHaveBeenCalledWith("1", {
        officialName: undefined,
        officialNameKana: undefined,
        officeAddress: "新しい住所",
        officeAddressBuilding: undefined,
        details: undefined,
      });
    });
  });

  describe("上限の検証", () => {
    it("入力欄の制限を迂回して上限を超える値を送ると、保存せずに違反した項目を返す", async () => {
      const mockRepository = createMockRepository();

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        id: "1",
        politicalOrganizationId: "100",
        financialYear: 2024,
        officialName: "あ".repeat(121),
        details: {
          contactPersons: [
            { id: "1", lastName: "田中", firstName: "一郎", tel: "0".repeat(21) },
            { id: "2", lastName: "田中", firstName: "二郎", tel: "" },
            { id: "3", lastName: "田中", firstName: "三郎", tel: "" },
            { id: "4", lastName: "田中", firstName: "四郎", tel: "" },
          ],
        },
      });

      expect(result).toEqual({
        success: false,
        errors: [
          "政治団体の名称は120文字以内で入力してください",
          "事務担当者は3件まで登録できます",
          "事務担当者（1人目）の電話番号は20文字以内で入力してください",
        ],
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("新規作成でも上限を超える値は保存しない", async () => {
      const mockRepository = createMockRepository();

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "100",
        financialYear: 2024,
        details: { organizationType: "123" },
      });

      expect(result).toEqual({
        success: false,
        errors: ["団体区分は2文字以内で入力してください"],
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("必須項目が空のままでも保存できる（入力途中の保存）", async () => {
      const mockRepository = createMockRepository();
      const expectedProfile = createMockProfile({
        officialName: null,
        officialNameKana: null,
        officeAddress: null,
      });
      mockRepository.create.mockResolvedValue(expectedProfile);

      const usecase = new SaveOrganizationProfileUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "100",
        financialYear: 2024,
        officialName: null,
        officialNameKana: null,
        officeAddress: null,
        details: { representative: { lastName: "", firstName: "" } },
      });

      expect(result).toEqual({ success: true, profile: expectedProfile });
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });
});
