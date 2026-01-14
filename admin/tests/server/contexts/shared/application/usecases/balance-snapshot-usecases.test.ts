import { CreateBalanceSnapshotUsecase } from "@/server/contexts/shared/application/usecases/create-balance-snapshot-usecase";
import { DeleteBalanceSnapshotUsecase } from "@/server/contexts/shared/application/usecases/delete-balance-snapshot-usecase";
import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import type {
  CreateBalanceSnapshotInput,
  IBalanceSnapshotRepository,
} from "@/server/contexts/shared/domain/repositories/balance-snapshot-repository.interface";

describe("Balance Snapshot Usecases", () => {
  let mockRepository: jest.Mocked<IBalanceSnapshotRepository>;

  const createMockBalanceSnapshot = (overrides: Partial<BalanceSnapshot> = {}): BalanceSnapshot => ({
    id: "bs-1",
    political_organization_id: "org-1",
    snapshot_date: new Date("2024-03-31"),
    balance: 1000000,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe("CreateBalanceSnapshotUsecase", () => {
    it("残高スナップショットを作成する", async () => {
      const input: CreateBalanceSnapshotInput = {
        political_organization_id: "org-1",
        snapshot_date: new Date("2024-03-31"),
        balance: 1000000,
      };
      const created = createMockBalanceSnapshot();
      mockRepository.create.mockResolvedValue(created);

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);
      const result = await usecase.execute(input);

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it("政治組織IDがない場合はエラーを返す", async () => {
      const input: CreateBalanceSnapshotInput = {
        political_organization_id: "",
        snapshot_date: new Date("2024-03-31"),
        balance: 1000000,
      };

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute(input)).rejects.toThrow("Political organization ID is required");
    });

    it("スナップショット日付がない場合はエラーを返す", async () => {
      const input = {
        political_organization_id: "org-1",
        snapshot_date: null as unknown as Date,
        balance: 1000000,
      };

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute(input)).rejects.toThrow("Snapshot date is required");
    });

    it("残高がない場合はエラーを返す", async () => {
      const input = {
        political_organization_id: "org-1",
        snapshot_date: new Date("2024-03-31"),
        balance: undefined as unknown as number,
      };

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute(input)).rejects.toThrow("Balance is required");
    });

    it("未来の日付はエラーを返す", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const input: CreateBalanceSnapshotInput = {
        political_organization_id: "org-1",
        snapshot_date: futureDate,
        balance: 1000000,
      };

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute(input)).rejects.toThrow("未来の日付は登録できません");
    });

    it("今日の日付は登録できる", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const input: CreateBalanceSnapshotInput = {
        political_organization_id: "org-1",
        snapshot_date: today,
        balance: 1000000,
      };
      const created = createMockBalanceSnapshot({ snapshot_date: today });
      mockRepository.create.mockResolvedValue(created);

      const usecase = new CreateBalanceSnapshotUsecase(mockRepository);
      const result = await usecase.execute(input);

      expect(result).toEqual(created);
    });
  });

  describe("DeleteBalanceSnapshotUsecase", () => {
    it("残高スナップショットを削除する", async () => {
      mockRepository.delete.mockResolvedValue();

      const usecase = new DeleteBalanceSnapshotUsecase(mockRepository);
      await usecase.execute("bs-1");

      expect(mockRepository.delete).toHaveBeenCalledWith("bs-1");
    });

    it("IDがない場合はエラーを返す", async () => {
      const usecase = new DeleteBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute("")).rejects.toThrow("Balance snapshot ID is required");
    });

    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      mockRepository.delete.mockRejectedValue(new Error("Database error"));

      const usecase = new DeleteBalanceSnapshotUsecase(mockRepository);

      await expect(usecase.execute("bs-1")).rejects.toThrow("Failed to delete balance snapshot: Database error");
    });
  });
});
