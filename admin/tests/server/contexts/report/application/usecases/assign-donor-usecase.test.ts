import { BulkAssignDonorUsecase } from "@/server/contexts/report/application/usecases/assign-donor-usecase";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";

const createTransaction = (overrides: Partial<TransactionWithDonor>): TransactionWithDonor => ({
  id: "1",
  transactionNo: "T2025-0001",
  transactionDate: new Date("2025-01-01"),
  financialYear: 2025,
  transactionType: "income",
  categoryKey: "individual-donations",
  friendlyCategory: null,
  label: null,
  description: null,
  memo: null,
  debitAmount: 10000,
  creditAmount: 10000,
  debitPartner: null,
  creditPartner: null,
  donor: null,
  requiresDonor: true,
  allowedDonorTypes: ["individual"],
  ...overrides,
});

describe("BulkAssignDonorUsecase", () => {
  const transactionRepository = {
    findByIdsWithDonor: jest.fn(),
  } as unknown as jest.Mocked<ITransactionWithDonorRepository>;
  const donorRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<IDonorRepository>;
  const transactionDonorRepository = {
    replaceMany: jest.fn(),
  } as unknown as jest.Mocked<ITransactionDonorRepository>;

  const usecase = new BulkAssignDonorUsecase(
    transactionRepository,
    donorRepository,
    transactionDonorRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    donorRepository.findById.mockResolvedValue({
      id: "10",
      donorType: "corporation",
      name: "株式会社テスト",
    } as Donor);
  });

  it("種別が許可されないカテゴリがあればドメインの却下理由を返し、紐付けない", async () => {
    transactionRepository.findByIdsWithDonor.mockResolvedValue([
      createTransaction({ id: "1", categoryKey: "individual-donations" }),
      createTransaction({ id: "2", categoryKey: "individual-donations" }),
      createTransaction({ id: "3", categoryKey: "corporate-donations" }),
    ]);

    const result = await usecase.execute({ transactionIds: ["1", "2", "3"], donorId: "10" });

    expect(result).toEqual({
      success: false,
      errors: ["カテゴリ '個人からの寄附' に対して寄付者種別 '法人' は指定できません"],
    });
    expect(transactionDonorRepository.replaceMany).not.toHaveBeenCalled();
  });

  it("すべてのカテゴリで許可される種別なら紐付ける", async () => {
    transactionRepository.findByIdsWithDonor.mockResolvedValue([
      createTransaction({ id: "3", categoryKey: "corporate-donations" }),
    ]);

    const result = await usecase.execute({ transactionIds: ["3"], donorId: "10" });

    expect(result).toEqual({ success: true, assignedCount: 1 });
    expect(transactionDonorRepository.replaceMany).toHaveBeenCalledWith(
      [BigInt(3)],
      [{ transactionId: BigInt(3), donorId: BigInt(10) }],
    );
  });
});
