import { GetAllCounterpartsUsecase } from "@/server/contexts/report/application/usecases/get-all-counterparts-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";

describe("GetAllCounterpartsUsecase", () => {
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

  it("全取引先を取得する（デフォルトlimit=1000）", async () => {
    const counterparts = [
      createMockCounterpart({ id: "cp-1" }),
      createMockCounterpart({ id: "cp-2", name: "別の取引先" }),
    ];
    mockRepository.findAll.mockResolvedValue(counterparts);

    const usecase = new GetAllCounterpartsUsecase(mockRepository);
    const result = await usecase.execute();

    expect(result).toEqual(counterparts);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ limit: 1000 });
  });

  it("カスタムlimitを指定して取得する", async () => {
    const counterparts = [createMockCounterpart()];
    mockRepository.findAll.mockResolvedValue(counterparts);

    const usecase = new GetAllCounterpartsUsecase(mockRepository);
    const result = await usecase.execute({ limit: 500 });

    expect(result).toEqual(counterparts);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ limit: 500 });
  });
});
