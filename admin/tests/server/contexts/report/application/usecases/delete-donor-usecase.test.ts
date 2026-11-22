import { DeleteDonorUsecase } from "@/server/contexts/report/application/usecases/delete-donor-usecase";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

const donor: Donor = {
  id: "1",
  donorType: "individual",
  name: "山田太郎",
  address: null,
  occupation: "会社員",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("DeleteDonorUsecase", () => {
  let repository: jest.Mocked<Pick<IDonorRepository, "findById" | "getUsageCount" | "delete">>;
  let usecase: DeleteDonorUsecase;

  beforeEach(() => {
    repository = {
      findById: jest.fn().mockResolvedValue(donor),
      getUsageCount: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    usecase = new DeleteDonorUsecase(repository as unknown as IDonorRepository);
  });

  it("寄付者が無ければエラーを返す", async () => {
    repository.findById.mockResolvedValue(null);

    expect(await usecase.execute("1")).toEqual({
      success: false,
      errors: ["寄付者が見つかりません"],
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("使用中の寄付者も削除する", async () => {
    repository.getUsageCount.mockResolvedValue(3);

    expect(await usecase.execute("1")).toEqual({ success: true });
    expect(repository.delete).toHaveBeenCalledWith("1");
  });
});
