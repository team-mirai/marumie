import { GetCounterpartByIdUsecase } from "@/server/contexts/report/application/usecases/get-counterpart-by-id-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";

describe("GetCounterpartByIdUsecase", () => {
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

  it("IDで取引先を取得する", async () => {
    const counterpart = createMockCounterpart();
    mockRepository.findById.mockResolvedValue(counterpart);

    const usecase = new GetCounterpartByIdUsecase(mockRepository);
    const result = await usecase.execute("cp-1");

    expect(result).toEqual(counterpart);
    expect(mockRepository.findById).toHaveBeenCalledWith("cp-1");
  });

  it("存在しない場合はnullを返す", async () => {
    mockRepository.findById.mockResolvedValue(null);

    const usecase = new GetCounterpartByIdUsecase(mockRepository);
    const result = await usecase.execute("non-existent");

    expect(result).toBeNull();
  });
});
