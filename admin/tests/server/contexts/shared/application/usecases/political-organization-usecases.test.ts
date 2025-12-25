import { CreatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/create-political-organization-usecase";
import { DeletePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/delete-political-organization-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

describe("Political Organization Usecases", () => {
  let mockRepository: jest.Mocked<IPoliticalOrganizationRepository>;

  const createMockOrganization = (overrides: Partial<PoliticalOrganization> = {}): PoliticalOrganization => ({
    id: "1",
    displayName: "テスト政治団体",
    slug: "test-org",
    orgName: "テスト政治団体正式名称",
    description: "テスト用の政治団体です",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countTransactions: jest.fn(),
    };
  });

  describe("CreatePoliticalOrganizationUsecase", () => {
    it("政治団体を作成する", async () => {
      const created = createMockOrganization();
      mockRepository.create.mockResolvedValue(created);

      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);
      const result = await usecase.execute("テスト政治団体", "test-org", "テスト政治団体正式名称", "テスト用の政治団体です");

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(
        "テスト政治団体",
        "test-org",
        "テスト政治団体正式名称",
        "テスト用の政治団体です",
      );
    });

    it("オプションパラメータなしで作成する", async () => {
      const created = createMockOrganization({ orgName: undefined, description: undefined });
      mockRepository.create.mockResolvedValue(created);

      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);
      const result = await usecase.execute("テスト政治団体", "test-org");

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(
        "テスト政治団体",
        "test-org",
        undefined,
        undefined,
      );
    });

    it("表示名がない場合はエラーを返す", async () => {
      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);

      await expect(usecase.execute("", "test-org")).rejects.toThrow("Organization display name is required");
    });

    it("表示名が空白のみの場合はエラーを返す", async () => {
      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);

      await expect(usecase.execute("   ", "test-org")).rejects.toThrow("Organization display name is required");
    });

    it("slugがない場合はエラーを返す", async () => {
      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);

      await expect(usecase.execute("テスト政治団体", "")).rejects.toThrow("Organization slug is required");
    });

    it("slugが空白のみの場合はエラーを返す", async () => {
      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);

      await expect(usecase.execute("テスト政治団体", "   ")).rejects.toThrow("Organization slug is required");
    });

    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      mockRepository.create.mockRejectedValue(new Error("Database error"));

      const usecase = new CreatePoliticalOrganizationUsecase(mockRepository);

      await expect(usecase.execute("テスト政治団体", "test-org")).rejects.toThrow("Failed to create organization: Database error");
    });
  });

  describe("DeletePoliticalOrganizationUsecase", () => {
    it("取引がない政治団体を削除する", async () => {
      mockRepository.countTransactions.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue();

      const usecase = new DeletePoliticalOrganizationUsecase(mockRepository);
      const result = await usecase.execute(BigInt(1));

      expect(result.success).toBe(true);
      expect(result.message).toBe("政治団体を削除しました。");
      expect(mockRepository.delete).toHaveBeenCalledWith(BigInt(1));
    });

    it("取引がある政治団体は削除できない", async () => {
      mockRepository.countTransactions.mockResolvedValue(10);

      const usecase = new DeletePoliticalOrganizationUsecase(mockRepository);
      const result = await usecase.execute(BigInt(1));

      expect(result.success).toBe(false);
      expect(result.message).toContain("10件の取引が紐づいているため削除できません");
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("リポジトリがエラーを投げた場合はエラー結果を返す", async () => {
      mockRepository.countTransactions.mockRejectedValue(new Error("Database error"));

      const usecase = new DeletePoliticalOrganizationUsecase(mockRepository);
      const result = await usecase.execute(BigInt(1));

      expect(result.success).toBe(false);
      expect(result.message).toBe("削除中にエラーが発生しました。");
    });
  });
});
