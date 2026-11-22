import { CreateCounterpartUsecase } from "@/server/contexts/report/application/usecases/create-counterpart-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import {
  type Counterpart,
  MAX_POSTAL_CODE_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

describe("CreateCounterpartUsecase", () => {
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

  it("新しい取引先を作成する", async () => {
    const newCounterpart = createMockCounterpart({ name: "新規取引先" });
    mockRepository.findByNameAndAddress.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(newCounterpart);

    const usecase = new CreateCounterpartUsecase(mockRepository);
    const result = await usecase.execute({ name: "新規取引先", postalCode: null, address: "東京都" });

    expect(result.success).toBe(true);
    expect(result.counterpart).toEqual(newCounterpart);
  });

  it("名前が空の場合はエラーを返す", async () => {
    const usecase = new CreateCounterpartUsecase(mockRepository);
    const result = await usecase.execute({ name: "", postalCode: null, address: null });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("名前は必須です");
  });

  it("重複する名前・住所の組み合わせはエラーを返す", async () => {
    mockRepository.findByNameAndAddress.mockResolvedValue(createMockCounterpart());

    const usecase = new CreateCounterpartUsecase(mockRepository);
    const result = await usecase.execute({ name: "テスト取引先", postalCode: null, address: "東京都千代田区" });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("同じ名前・住所の組み合わせが既に存在します");
  });

  it("名前と住所の前後の空白をトリムする", async () => {
    const newCounterpart = createMockCounterpart();
    mockRepository.findByNameAndAddress.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue(newCounterpart);

    const usecase = new CreateCounterpartUsecase(mockRepository);
    await usecase.execute({ name: "  テスト取引先  ", postalCode: "  123-4567  ", address: "  東京都  " });

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: "テスト取引先",
      postalCode: "123-4567",
      address: "東京都",
    });
  });

  it("郵便番号が最大長を超えると入力エラーを返し、保存しない", async () => {
    const usecase = new CreateCounterpartUsecase(mockRepository);
    const result = await usecase.execute({
      name: "テスト取引先",
      postalCode: "1".repeat(MAX_POSTAL_CODE_LENGTH + 1),
      address: null,
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(`郵便番号は${MAX_POSTAL_CODE_LENGTH}文字以内で入力してください`);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
