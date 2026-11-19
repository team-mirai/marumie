import { DeleteCounterpartUsecase } from "@/server/contexts/report/application/usecases/delete-counterpart-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";

describe("DeleteCounterpartUsecase", () => {
  let mockRepository: jest.Mocked<ICounterpartRepository>;

  const createMockCounterpart = (overrides: Partial<Counterpart> = {}): Counterpart => ({
    id: "cp-1",
    name: "テスト取引先",
    postalCode: null,
    address: "東京都千代田区",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
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

  it("取引先を削除する", async () => {
    mockRepository.findById.mockResolvedValue(createMockCounterpart());
    mockRepository.getUsageCount.mockResolvedValue(0);
    mockRepository.delete.mockResolvedValue();

    const usecase = new DeleteCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1");

    expect(result.success).toBe(true);
    expect(mockRepository.delete).toHaveBeenCalledWith("cp-1");
  });

  it("存在しない取引先はエラーを返す", async () => {
    mockRepository.findById.mockResolvedValue(null);

    const usecase = new DeleteCounterpartUsecase(mockRepository);
    const result = await usecase.execute("non-existent");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("取引先が見つかりません");
  });

  it("使用中の取引先はエラーを返す", async () => {
    mockRepository.findById.mockResolvedValue(createMockCounterpart());
    mockRepository.getUsageCount.mockResolvedValue(3);

    const usecase = new DeleteCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1");

    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain("3件のトランザクションで使用されています");
  });

  it("checkUsage=falseの場合は使用中でも削除できる", async () => {
    mockRepository.findById.mockResolvedValue(createMockCounterpart());
    mockRepository.delete.mockResolvedValue();

    const usecase = new DeleteCounterpartUsecase(mockRepository, false);
    const result = await usecase.execute("cp-1");

    expect(result.success).toBe(true);
    expect(mockRepository.getUsageCount).not.toHaveBeenCalled();
  });
});
