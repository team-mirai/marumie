import { GetCounterpartUsageUsecase } from "@/server/contexts/report/application/usecases/get-counterpart-usage-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

describe("GetCounterpartUsageUsecase", () => {
  let mockRepository: jest.Mocked<ICounterpartRepository>;

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

  it("取引先の使用回数を取得する", async () => {
    mockRepository.getUsageCount.mockResolvedValue(5);

    const usecase = new GetCounterpartUsageUsecase(mockRepository);
    const result = await usecase.execute("cp-1");

    expect(result).toBe(5);
    expect(mockRepository.getUsageCount).toHaveBeenCalledWith("cp-1");
  });
});
