import { GetCounterpartDetailUsecase } from "@/server/contexts/report/application/usecases/get-counterpart-detail-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";

describe("GetCounterpartDetailUsecase", () => {
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

  it("取引先詳細情報を並列で取得する", async () => {
    const counterpart = createMockCounterpart();
    const allCounterparts = [counterpart, createMockCounterpart({ id: "cp-2", name: "別の取引先" })];

    mockRepository.findById.mockResolvedValue(counterpart);
    mockRepository.getUsageCount.mockResolvedValue(5);
    mockRepository.findAll.mockResolvedValue(allCounterparts);

    const usecase = new GetCounterpartDetailUsecase(mockRepository);
    const result = await usecase.execute("cp-1");

    expect(result.counterpart).toEqual(counterpart);
    expect(result.usageCount).toBe(5);
    expect(result.allCounterparts).toEqual(allCounterparts);
    expect(mockRepository.findById).toHaveBeenCalledWith("cp-1");
    expect(mockRepository.getUsageCount).toHaveBeenCalledWith("cp-1");
    expect(mockRepository.findAll).toHaveBeenCalledWith({ limit: 1000 });
  });

  it("存在しない取引先の場合はcounterpartがnullになる", async () => {
    const allCounterparts = [createMockCounterpart()];

    mockRepository.findById.mockResolvedValue(null);
    mockRepository.getUsageCount.mockResolvedValue(0);
    mockRepository.findAll.mockResolvedValue(allCounterparts);

    const usecase = new GetCounterpartDetailUsecase(mockRepository);
    const result = await usecase.execute("non-existent");

    expect(result.counterpart).toBeNull();
    expect(result.usageCount).toBe(0);
    expect(result.allCounterparts).toEqual(allCounterparts);
  });
});
