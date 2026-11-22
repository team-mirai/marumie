import { UpdateCounterpartUsecase } from "@/server/contexts/report/application/usecases/update-counterpart-usecase";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import {
  type Counterpart,
  MAX_POSTAL_CODE_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

describe("UpdateCounterpartUsecase", () => {
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

  it("取引先を更新する", async () => {
    const existing = createMockCounterpart();
    const updated = createMockCounterpart({ name: "更新後の名前" });
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.findByNameAndAddress.mockResolvedValue(null);
    mockRepository.update.mockResolvedValue(updated);

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1", { name: "更新後の名前" });

    expect(result.success).toBe(true);
    expect(result.counterpart).toEqual(updated);
  });

  it("存在しない取引先はエラーを返す", async () => {
    mockRepository.findById.mockResolvedValue(null);

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    const result = await usecase.execute("non-existent", { name: "新しい名前" });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("取引先が見つかりません");
  });

  it("重複する名前・住所の組み合わせはエラーを返す", async () => {
    const existing = createMockCounterpart({ id: "cp-1" });
    const duplicate = createMockCounterpart({ id: "cp-2" });
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.findByNameAndAddress.mockResolvedValue(duplicate);

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1", { name: "重複する名前", address: "重複する住所" });

    expect(result.success).toBe(false);
    expect(result.errors).toContain("同じ名前・住所の組み合わせが既に存在します");
  });

  it("同じ取引先への更新は重複エラーにならない", async () => {
    const existing = createMockCounterpart({ id: "cp-1" });
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.findByNameAndAddress.mockResolvedValue(existing);
    mockRepository.update.mockResolvedValue(existing);

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1", { name: "テスト取引先" });

    expect(result.success).toBe(true);
  });

  it("前後の空白を除き、空の郵便番号・住所を未登録にして保存する。渡されなかった項目は今の値のまま", async () => {
    const existing = createMockCounterpart({ id: "cp-1" });
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.findByNameAndAddress.mockResolvedValue(null);
    mockRepository.update.mockResolvedValue(existing);

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    await usecase.execute("cp-1", { name: "  新しい名前  ", postalCode: "   " });

    expect(mockRepository.update).toHaveBeenCalledWith("cp-1", {
      name: "新しい名前",
      postalCode: null,
      address: existing.address,
    });
  });

  it("郵便番号が最大長を超えると入力エラーを返し、保存しない", async () => {
    mockRepository.findById.mockResolvedValue(createMockCounterpart({ id: "cp-1" }));

    const usecase = new UpdateCounterpartUsecase(mockRepository);
    const result = await usecase.execute("cp-1", { postalCode: "1".repeat(MAX_POSTAL_CODE_LENGTH + 1) });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(`郵便番号は${MAX_POSTAL_CODE_LENGTH}文字以内で入力してください`);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });
});
