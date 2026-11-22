import { CreateDonorUsecase } from "@/server/contexts/report/application/usecases/create-donor-usecase";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

const donor = (overrides: Partial<Donor> = {}): Donor => ({
  id: "1",
  donorType: "individual",
  name: "山田太郎",
  address: "東京都",
  occupation: "会社員",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

describe("CreateDonorUsecase", () => {
  let repository: jest.Mocked<Pick<IDonorRepository, "findByMatchCriteriaBatch" | "create">>;
  let usecase: CreateDonorUsecase;

  beforeEach(() => {
    repository = {
      findByMatchCriteriaBatch: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(async (input) => donor({ id: "10", ...input })),
    };
    usecase = new CreateDonorUsecase(repository as unknown as IDonorRepository);
  });

  it("正規化した入力で寄付者を作成する", async () => {
    const result = await usecase.execute({
      donorType: "individual",
      name: " 山田太郎 ",
      address: " ",
      occupation: " 会社員 ",
    });

    expect(result.success).toBe(true);
    expect(repository.create).toHaveBeenCalledWith({
      donorType: "individual",
      name: "山田太郎",
      address: null,
      occupation: "会社員",
    });
  });

  it("個人以外に入力された職業は保存しない", async () => {
    await usecase.execute({
      donorType: "corporation",
      name: "株式会社A",
      address: null,
      occupation: "会社員",
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ donorType: "corporation", occupation: null }),
    );
  });

  it("入力が不正なら作成せずドメインの却下理由を返す", async () => {
    const result = await usecase.execute({
      donorType: "individual",
      name: "山田",
      address: null,
      occupation: "",
    });

    expect(result).toEqual({ success: false, errors: ["個人の場合、職業は必須です"] });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("同じ名前・住所・種別の寄付者がいれば作成しない", async () => {
    repository.findByMatchCriteriaBatch.mockResolvedValue([donor()]);

    const result = await usecase.execute({
      donorType: "individual",
      name: "山田太郎",
      address: "東京都",
      occupation: "自営業",
    });

    expect(repository.findByMatchCriteriaBatch).toHaveBeenCalledWith([
      expect.objectContaining({ name: "山田太郎", address: "東京都", donorType: "individual" }),
    ]);
    expect(result).toEqual({
      success: false,
      errors: ["同じ名前・住所・種別の組み合わせが既に存在します"],
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
