import { CreatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/create-political-organization-usecase";
import { UpdatePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/update-political-organization-usecase";
import { DeletePoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/delete-political-organization-usecase";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import { PoliticalOrganizationInputError } from "@/server/contexts/shared/domain/errors/political-organization-input-error";

describe("Political Organization Usecases", () => {
  let mockRepository: jest.Mocked<IPoliticalOrganizationRepository>;

  const createMockOrganization = (overrides: Partial<PoliticalOrganization> = {}): PoliticalOrganization => ({
    id: "1",
    displayName: "テスト政治団体",
    slug: "test-org",
    orgName: "テスト政治団体正式名称",
    description: "テスト用の政治団体です",
    websiteUrl: null,
    snsUrls: [],
    photoPath: null,
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
      setPhotoPath: jest.fn(),
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

  describe("UpdatePoliticalOrganizationUsecase", () => {
    const basics = { displayName: "テスト政治団体", slug: "test-org" };

    it("公式サイト・SNS を整えて保存する", async () => {
      mockRepository.update.mockResolvedValue(createMockOrganization());

      await new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
        ...basics,
        websiteUrl: " https://example.jp ",
        snsUrls: [" https://x.com/team_mirai ", "", "https://www.youtube.com/@team_mirai"],
      });

      expect(mockRepository.update).toHaveBeenCalledWith(BigInt(1), {
        ...basics,
        websiteUrl: "https://example.jp",
        snsUrls: ["https://x.com/team_mirai", "https://www.youtube.com/@team_mirai"],
      });
    });

    it("公式サイト・SNS が未入力でも保存できる", async () => {
      mockRepository.update.mockResolvedValue(createMockOrganization());

      await new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
        ...basics,
        websiteUrl: "",
        snsUrls: [],
      });

      expect(mockRepository.update).toHaveBeenCalledWith(BigInt(1), {
        ...basics,
        websiteUrl: "",
        snsUrls: [],
      });
    });

    it("公式サイト・SNS を渡さなければそのまま保存する", async () => {
      mockRepository.update.mockResolvedValue(createMockOrganization());

      await new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), basics);

      expect(mockRepository.update).toHaveBeenCalledWith(BigInt(1), basics);
    });

    it("公式サイトだけを渡したら公式サイトだけを保存する", async () => {
      mockRepository.update.mockResolvedValue(createMockOrganization());

      await new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
        ...basics,
        websiteUrl: " https://example.jp ",
      });

      expect(mockRepository.update).toHaveBeenCalledWith(BigInt(1), {
        ...basics,
        websiteUrl: "https://example.jp",
      });
    });

    it("SNS だけを渡したら SNS だけを保存する", async () => {
      mockRepository.update.mockResolvedValue(createMockOrganization());

      await new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
        ...basics,
        snsUrls: ["", " https://x.com/team_mirai "],
      });

      expect(mockRepository.update).toHaveBeenCalledWith(BigInt(1), {
        ...basics,
        snsUrls: ["https://x.com/team_mirai"],
      });
    });

    it("SNS だけを渡しても不正な URL なら保存しない", async () => {
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
          ...basics,
          snsUrls: ["ftp://example.jp"],
        }),
      ).rejects.toThrow(PoliticalOrganizationInputError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("公式サイトの URL が不正なら保存しない", async () => {
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
          ...basics,
          websiteUrl: "javascript:alert(1)",
          snsUrls: [],
        }),
      ).rejects.toThrow("公式サイトの URL を正しく入力してください");
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("SNS の URL が不正なら何件目かを示して保存しない", async () => {
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
          ...basics,
          websiteUrl: "",
          snsUrls: ["https://x.com/team_mirai", "not a url"],
        }),
      ).rejects.toThrow("SNS の URL（2件目）を正しく入力してください");
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("型の合わない入力は保存しない", async () => {
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
          ...basics,
          websiteUrl: "",
          snsUrls: [1 as unknown as string],
        }),
      ).rejects.toThrow("公式サイト・SNS の入力内容を確認してください");
    });

    it("表示名がない場合はエラーを返す", async () => {
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), {
          ...basics,
          displayName: " ",
        }),
      ).rejects.toThrow("表示名は必須です");
    });

    it("リポジトリのエラーは包んで投げる", async () => {
      mockRepository.update.mockRejectedValue(new Error("Database error"));

      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), basics),
      ).rejects.toThrow("Failed to update political organization: Database error");
      await expect(
        new UpdatePoliticalOrganizationUsecase(mockRepository).execute(BigInt(1), basics),
      ).rejects.not.toThrow(PoliticalOrganizationInputError);
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
