import { UpdateDonorUsecase } from "@/server/contexts/report/application/usecases/update-donor-usecase";
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

describe("UpdateDonorUsecase", () => {
  let repository: jest.Mocked<
    Pick<IDonorRepository, "findById" | "findByMatchCriteriaBatch" | "update">
  >;
  let usecase: UpdateDonorUsecase;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue(donor()),
      findByMatchCriteriaBatch: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(async (id, input) => donor({ id, ...input })),
    };
    usecase = new UpdateDonorUsecase(repository as unknown as IDonorRepository);
  });

  it("寄付者が無ければエラーを返す", async () => {
    repository.findById.mockResolvedValue(null);

    const result = await usecase.execute("1", { name: "A" });

    expect(result).toEqual({ success: false, errors: ["寄付者が見つかりません"] });
  });

  it("指定の無い項目は現在の値を使い、正規化して更新する", async () => {
    const result = await usecase.execute("1", { name: " 山田花子 ", address: "" });

    expect(result.success).toBe(true);
    expect(repository.update).toHaveBeenCalledWith("1", {
      donorType: "individual",
      name: "山田花子",
      address: null,
      occupation: "会社員",
    });
  });

  it("個人以外に変えると職業は保存しない", async () => {
    await usecase.execute("1", { donorType: "corporation", occupation: "会社員" });

    expect(repository.update).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ donorType: "corporation", occupation: null }),
    );
  });

  it("入力が不正なら更新せずドメインの却下理由を返す", async () => {
    const result = await usecase.execute("1", { occupation: " " });

    expect(result).toEqual({ success: false, errors: ["個人の場合、職業は必須です"] });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("別の寄付者と名前・住所・種別が重なる更新はしない", async () => {
    repository.findByMatchCriteriaBatch.mockResolvedValue([donor({ id: "2", name: "山田花子" })]);

    const result = await usecase.execute("1", { name: "山田花子" });

    expect(result).toEqual({
      success: false,
      errors: ["同じ名前・住所・種別の組み合わせが既に存在します"],
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("名前・住所・種別を変えない更新は、既に重複があっても止めない", async () => {
    repository.findByMatchCriteriaBatch.mockResolvedValue([donor({ id: "1" }), donor({ id: "2" })]);

    const result = await usecase.execute("1", { occupation: "自営業" });

    expect(result.success).toBe(true);
  });
});
