import {
  PreviewDonorCsvUsecase,
  type PreviewDonorCsvInput,
} from "@/server/contexts/report/application/usecases/preview-donor-csv-usecase";
import type { DonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import type { DonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import type { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type { DonorCsvRecord } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";

describe("PreviewDonorCsvUsecase", () => {
  const mockCsvLoader: jest.Mocked<DonorCsvLoader> = {
    load: jest.fn(),
  } as unknown as jest.Mocked<DonorCsvLoader>;

  const mockRecordConverter: jest.Mocked<DonorCsvRecordConverter> = {
    convert: jest.fn(),
  } as unknown as jest.Mocked<DonorCsvRecordConverter>;

  const mockValidator: jest.Mocked<DonorCsvValidator> = {
    validate: jest.fn(),
  } as unknown as jest.Mocked<DonorCsvValidator>;

  const mockTransactionRepository: jest.Mocked<ITransactionWithDonorRepository> = {
    findWithPagination: jest.fn(),
    findByTransactionNosForDonorCsv: jest.fn(),
  } as unknown as jest.Mocked<ITransactionWithDonorRepository>;

  const mockDonorRepository: jest.Mocked<IDonorRepository> = {
    findById: jest.fn(),
    findByMatchCriteriaBatch: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<IDonorRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockCsvRecord = (overrides: Partial<DonorCsvRecord> = {}): DonorCsvRecord => ({
    rowNumber: 1,
    transaction_no: "T2025-0001",
    name: "テスト太郎",
    donorType: "個人",
    address: "東京都渋谷区",
    occupation: "会社員",
    ...overrides,
  });

  const createMockRow = (overrides: Partial<PreviewDonorCsvRow> = {}): PreviewDonorCsvRow => ({
    rowNumber: 1,
    transactionNo: "T2025-0001",
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    status: "valid",
    errors: [],
    transaction: null,
    matchingDonor: null,
    ...overrides,
  });

  const createMockTransaction = (
    overrides: Partial<TransactionForDonorCsv> = {},
  ): TransactionForDonorCsv => ({
    id: "tx-1",
    transactionNo: "T2025-0001",
    transactionDate: new Date("2025-06-01"),
    categoryKey: "individual-donations",
    friendlyCategory: "個人からの寄附",
    debitAmount: 10000,
    creditAmount: 10000,
    debitPartner: null,
    creditPartner: null,
    existingDonor: null,
    ...overrides,
  });

  it("should process CSV and return preview result", async () => {
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow();
    const transaction = createMockTransaction();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockReturnValue([{ ...previewRow, status: "valid" }]);

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.rows).toHaveLength(1);
    expect(result.summary.total).toBe(1);
    expect(result.summary.valid).toBe(1);
    expect(mockCsvLoader.load).toHaveBeenCalledWith("dummy csv content");
    expect(mockTransactionRepository.findByTransactionNosForDonorCsv).toHaveBeenCalledWith(
      ["T2025-0001"],
      "org-123",
    );
  });

  it("should return empty result for empty CSV", async () => {
    mockCsvLoader.load.mockReturnValue([]);

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.rows).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(mockRecordConverter.convert).not.toHaveBeenCalled();
    expect(mockValidator.validate).not.toHaveBeenCalled();
  });

  it("should enrich rows with matching donors", async () => {
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow();
    const transaction = createMockTransaction();
    const matchingDonor = {
      id: "donor-1",
      name: "テスト太郎",
      donorType: "individual" as const,
      address: "東京都渋谷区",
      occupation: "会社員",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([matchingDonor]);
    mockValidator.validate.mockImplementation((rows) => rows);

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.rows[0].matchingDonor).not.toBeNull();
    expect(result.rows[0].matchingDonor?.id).toBe("donor-1");
    expect(mockDonorRepository.findByMatchCriteriaBatch).toHaveBeenCalledWith([
      { name: "テスト太郎", address: "東京都渋谷区", donorType: "individual" },
    ]);
  });

  it("should handle multiple rows with unique transaction numbers", async () => {
    const csvRecords = [
      createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001" }),
      createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0002" }),
    ];
    const previewRows = [
      createMockRow({ rowNumber: 1, transactionNo: "T2025-0001" }),
      createMockRow({ rowNumber: 2, transactionNo: "T2025-0002" }),
    ];
    const transactions = [
      createMockTransaction({ id: "tx-1", transactionNo: "T2025-0001" }),
      createMockTransaction({ id: "tx-2", transactionNo: "T2025-0002" }),
    ];

    mockCsvLoader.load.mockReturnValue(csvRecords);
    mockRecordConverter.convert
      .mockReturnValueOnce(previewRows[0])
      .mockReturnValueOnce(previewRows[1]);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue(transactions);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockImplementation((rows) =>
      rows.map((row) => ({ ...row, status: "valid" as const })),
    );

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.rows).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(2);
    expect(mockTransactionRepository.findByTransactionNosForDonorCsv).toHaveBeenCalledWith(
      ["T2025-0001", "T2025-0002"],
      "org-123",
    );
  });

  it("should throw error with user-friendly message on failure", async () => {
    mockCsvLoader.load.mockImplementation(() => {
      throw new Error("CSV parsing failed");
    });

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "invalid csv",
      politicalOrganizationId: "org-123",
    };

    await expect(usecase.execute(input)).rejects.toThrow("プレビュー処理に失敗しました");
  });

  it("should skip rows with null donorType when enriching with matching donors", async () => {
    const csvRecord = createMockCsvRecord({ donorType: "" });
    const previewRow = createMockRow({ donorType: null });
    const transaction = createMockTransaction();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockImplementation((rows) => rows);

    const usecase = new PreviewDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
    );

    const input: PreviewDonorCsvInput = {
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.rows[0].matchingDonor).toBeNull();
    expect(mockDonorRepository.findByMatchCriteriaBatch).toHaveBeenCalledWith([]);
  });
});
