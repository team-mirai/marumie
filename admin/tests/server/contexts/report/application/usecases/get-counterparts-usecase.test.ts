import { GetCounterpartsUsecase } from "@/server/contexts/report/application/usecases/get-counterparts-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart, CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";

describe("GetCounterpartsUsecase", () => {
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

  it("取引先一覧を取得する", async () => {
    const counterparts = [createMockCounterpartWithUsage()];
    mockRepository.findAllWithUsage.mockResolvedValue(counterparts);
    mockRepository.count.mockResolvedValue(1);

    const usecase = new GetCounterpartsUsecase(mockRepository);
    const result = await usecase.execute({});

    expect(result.counterparts).toEqual(counterparts);
    expect(result.total).toBe(1);
  });

  it("検索クエリを渡す", async () => {
    mockRepository.findAllWithUsage.mockResolvedValue([]);
    mockRepository.count.mockResolvedValue(0);

    const usecase = new GetCounterpartsUsecase(mockRepository);
    await usecase.execute({ searchQuery: "テスト", limit: 10, offset: 5 });

    expect(mockRepository.findAllWithUsage).toHaveBeenCalledWith({
      searchQuery: "テスト",
      limit: 10,
      offset: 5,
    });
  });
});
