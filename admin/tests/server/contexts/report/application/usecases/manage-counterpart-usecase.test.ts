import {
  GetCounterpartsUsecase,
  GetCounterpartByIdUsecase,
  CreateCounterpartUsecase,
  UpdateCounterpartUsecase,
  DeleteCounterpartUsecase,
  GetCounterpartUsageUsecase,
  GetCounterpartDetailUsecase,
  GetAllCounterpartsUsecase,
} from "@/server/contexts/report/application/usecases/manage-counterpart-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart, CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";

describe("manage-counterpart-usecase", () => {
  let mockRepository: jest.Mocked<ICounterpartRepository>;
  const tenantId = BigInt(1);

  const createMockCounterpart = (overrides: Partial<Counterpart> = {}): Counterpart => ({
    id: "cp-1",
    tenantId: "1",
    name: "テスト取引先",
    postalCode: null,
    address: "東京都千代田区",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  const createMockCounterpartWithUsage = (overrides: Partial<CounterpartWithUsage> = {}): CounterpartWithUsage => ({
    ...createMockCounterpart(),
    usageCount: 5,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNameAndAddress: jest.fn(),
      findAll: jest.fn(),
      findAllWithUsage: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUsageCount: jest.fn(),
      count: jest.fn(),
      findByUsageFrequency: jest.fn(),
      findByPartnerName: jest.fn(),
    };
  });

  describe("GetCounterpartsUsecase", () => {
    it("取引先一覧を取得する", async () => {
      const counterparts = [createMockCounterpartWithUsage()];
      mockRepository.findAllWithUsage.mockResolvedValue(counterparts);
      mockRepository.count.mockResolvedValue(1);

      const usecase = new GetCounterpartsUsecase(mockRepository);
      const result = await usecase.execute({ tenantId });

      expect(result.counterparts).toEqual(counterparts);
      expect(result.total).toBe(1);
    });

    it("検索クエリを渡す", async () => {
      mockRepository.findAllWithUsage.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      const usecase = new GetCounterpartsUsecase(mockRepository);
      await usecase.execute({ tenantId, searchQuery: "テスト", limit: 10, offset: 5 });

      expect(mockRepository.findAllWithUsage).toHaveBeenCalledWith({
        tenantId,
        searchQuery: "テスト",
        limit: 10,
        offset: 5,
      });
    });
  });

  describe("GetCounterpartByIdUsecase", () => {
    it("IDで取引先を取得する", async () => {
      const counterpart = createMockCounterpart();
      mockRepository.findById.mockResolvedValue(counterpart);

      const usecase = new GetCounterpartByIdUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId);

      expect(result).toEqual(counterpart);
      expect(mockRepository.findById).toHaveBeenCalledWith("cp-1", tenantId);
    });

    it("存在しない場合はnullを返す", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const usecase = new GetCounterpartByIdUsecase(mockRepository);
      const result = await usecase.execute("non-existent", tenantId);

      expect(result).toBeNull();
    });
  });

  describe("CreateCounterpartUsecase", () => {
    it("新しい取引先を作成する", async () => {
      const newCounterpart = createMockCounterpart({ name: "新規取引先" });
      mockRepository.findByNameAndAddress.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newCounterpart);

      const usecase = new CreateCounterpartUsecase(mockRepository);
      const result = await usecase.execute({ tenantId, name: "新規取引先", postalCode: null, address: "東京都" });

      expect(result.success).toBe(true);
      expect(result.counterpart).toEqual(newCounterpart);
    });

    it("名前が空の場合はエラーを返す", async () => {
      const usecase = new CreateCounterpartUsecase(mockRepository);
      const result = await usecase.execute({ tenantId, name: "", postalCode: null, address: null });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("名前は必須です");
    });

    it("重複する名前・住所の組み合わせはエラーを返す", async () => {
      mockRepository.findByNameAndAddress.mockResolvedValue(createMockCounterpart());

      const usecase = new CreateCounterpartUsecase(mockRepository);
      const result = await usecase.execute({ tenantId, name: "テスト取引先", postalCode: null, address: "東京都千代田区" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("同じ名前・住所の組み合わせが既に存在します");
    });

    it("名前と住所の前後の空白をトリムする", async () => {
      const newCounterpart = createMockCounterpart();
      mockRepository.findByNameAndAddress.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newCounterpart);

      const usecase = new CreateCounterpartUsecase(mockRepository);
      await usecase.execute({ tenantId, name: "  テスト取引先  ", postalCode: "  123-4567  ", address: "  東京都  " });

      expect(mockRepository.create).toHaveBeenCalledWith({
        tenantId,
        name: "テスト取引先",
        postalCode: "123-4567",
        address: "東京都",
      });
    });
  });

  describe("UpdateCounterpartUsecase", () => {
    it("取引先を更新する", async () => {
      const existing = createMockCounterpart();
      const updated = createMockCounterpart({ name: "更新後の名前" });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.findByNameAndAddress.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updated);

      const usecase = new UpdateCounterpartUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId, { name: "更新後の名前" });

      expect(result.success).toBe(true);
      expect(result.counterpart).toEqual(updated);
    });

    it("存在しない取引先はエラーを返す", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const usecase = new UpdateCounterpartUsecase(mockRepository);
      const result = await usecase.execute("non-existent", tenantId, { name: "新しい名前" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("取引先が見つかりません");
    });

    it("重複する名前・住所の組み合わせはエラーを返す", async () => {
      const existing = createMockCounterpart({ id: "cp-1" });
      const duplicate = createMockCounterpart({ id: "cp-2" });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.findByNameAndAddress.mockResolvedValue(duplicate);

      const usecase = new UpdateCounterpartUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId, { name: "重複する名前", address: "重複する住所" });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("同じ名前・住所の組み合わせが既に存在します");
    });

    it("同じ取引先への更新は重複エラーにならない", async () => {
      const existing = createMockCounterpart({ id: "cp-1" });
      mockRepository.findById.mockResolvedValue(existing);
      mockRepository.findByNameAndAddress.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(existing);

      const usecase = new UpdateCounterpartUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId, { name: "テスト取引先" });

      expect(result.success).toBe(true);
    });
  });

  describe("DeleteCounterpartUsecase", () => {
    it("取引先を削除する", async () => {
      mockRepository.findById.mockResolvedValue(createMockCounterpart());
      mockRepository.getUsageCount.mockResolvedValue(0);
      mockRepository.delete.mockResolvedValue();

      const usecase = new DeleteCounterpartUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId);

      expect(result.success).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith("cp-1", tenantId);
    });

    it("存在しない取引先はエラーを返す", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const usecase = new DeleteCounterpartUsecase(mockRepository);
      const result = await usecase.execute("non-existent", tenantId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("取引先が見つかりません");
    });

    it("使用中の取引先はエラーを返す", async () => {
      mockRepository.findById.mockResolvedValue(createMockCounterpart());
      mockRepository.getUsageCount.mockResolvedValue(3);

      const usecase = new DeleteCounterpartUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain("3件のトランザクションで使用されています");
    });

    it("checkUsage=falseの場合は使用中でも削除できる", async () => {
      mockRepository.findById.mockResolvedValue(createMockCounterpart());
      mockRepository.delete.mockResolvedValue();

      const usecase = new DeleteCounterpartUsecase(mockRepository, false);
      const result = await usecase.execute("cp-1", tenantId);

      expect(result.success).toBe(true);
      expect(mockRepository.getUsageCount).not.toHaveBeenCalled();
    });
  });

  describe("GetCounterpartUsageUsecase", () => {
    it("取引先の使用回数を取得する", async () => {
      mockRepository.getUsageCount.mockResolvedValue(5);

      const usecase = new GetCounterpartUsageUsecase(mockRepository);
      const result = await usecase.execute("cp-1");

      expect(result).toBe(5);
      expect(mockRepository.getUsageCount).toHaveBeenCalledWith("cp-1");
    });
  });

  describe("GetCounterpartDetailUsecase", () => {
    it("取引先詳細情報を並列で取得する", async () => {
      const counterpart = createMockCounterpart();
      const allCounterparts = [counterpart, createMockCounterpart({ id: "cp-2", name: "別の取引先" })];

      mockRepository.findById.mockResolvedValue(counterpart);
      mockRepository.getUsageCount.mockResolvedValue(5);
      mockRepository.findAll.mockResolvedValue(allCounterparts);

      const usecase = new GetCounterpartDetailUsecase(mockRepository);
      const result = await usecase.execute("cp-1", tenantId);

      expect(result.counterpart).toEqual(counterpart);
      expect(result.usageCount).toBe(5);
      expect(result.allCounterparts).toEqual(allCounterparts);
      expect(mockRepository.findById).toHaveBeenCalledWith("cp-1", tenantId);
      expect(mockRepository.getUsageCount).toHaveBeenCalledWith("cp-1");
      expect(mockRepository.findAll).toHaveBeenCalledWith({ tenantId, limit: 1000 });
    });

    it("存在しない取引先の場合はcounterpartがnullになる", async () => {
      const allCounterparts = [createMockCounterpart()];

      mockRepository.findById.mockResolvedValue(null);
      mockRepository.getUsageCount.mockResolvedValue(0);
      mockRepository.findAll.mockResolvedValue(allCounterparts);

      const usecase = new GetCounterpartDetailUsecase(mockRepository);
      const result = await usecase.execute("non-existent", tenantId);

      expect(result.counterpart).toBeNull();
      expect(result.usageCount).toBe(0);
      expect(result.allCounterparts).toEqual(allCounterparts);
    });
  });

  describe("GetAllCounterpartsUsecase", () => {
    it("全取引先を取得する（デフォルトlimit=1000）", async () => {
      const counterparts = [
        createMockCounterpart({ id: "cp-1" }),
        createMockCounterpart({ id: "cp-2", name: "別の取引先" }),
      ];
      mockRepository.findAll.mockResolvedValue(counterparts);

      const usecase = new GetAllCounterpartsUsecase(mockRepository);
      const result = await usecase.execute({ tenantId });

      expect(result).toEqual(counterparts);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ tenantId, limit: 1000 });
    });

    it("カスタムlimitを指定して取得する", async () => {
      const counterparts = [createMockCounterpart()];
      mockRepository.findAll.mockResolvedValue(counterparts);

      const usecase = new GetAllCounterpartsUsecase(mockRepository);
      const result = await usecase.execute({ tenantId, limit: 500 });

      expect(result).toEqual(counterparts);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ tenantId, limit: 500 });
    });
  });
});
