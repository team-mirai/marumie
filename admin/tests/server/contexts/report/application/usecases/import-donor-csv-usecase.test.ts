import {
  ImportDonorCsvUsecase,
  type ImportDonorCsvInput,
} from "@/server/contexts/report/application/usecases/import-donor-csv-usecase";
import type { IDonorCsvLoader } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-loader";
import type { IDonorCsvRecordConverter } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record-converter";
import type { IDonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import type { ITransactionDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import type { ITransactionManager } from "@/server/contexts/report/domain/repositories/transaction-manager.interface";
import type { DonorCsvRecord } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import { NoValidRowsError } from "@/server/contexts/report/domain/errors/donor-csv-error";

describe("ImportDonorCsvUsecase", () => {
  const tenantId = BigInt(1);

  const mockCsvLoader: jest.Mocked<IDonorCsvLoader> = {
    load: jest.fn(),
  } as unknown as jest.Mocked<IDonorCsvLoader>;

  const mockRecordConverter: jest.Mocked<IDonorCsvRecordConverter> = {
    convert: jest.fn(),
  } as unknown as jest.Mocked<IDonorCsvRecordConverter>;

  const mockValidator: jest.Mocked<IDonorCsvValidator> = {
    validate: jest.fn(),
  } as unknown as jest.Mocked<IDonorCsvValidator>;

  const mockTransactionRepository: jest.Mocked<ITransactionWithDonorRepository> = {
    findWithPagination: jest.fn(),
    findByTransactionNosForDonorCsv: jest.fn(),
  } as unknown as jest.Mocked<ITransactionWithDonorRepository>;

  const mockDonorRepository: jest.Mocked<IDonorRepository> = {
    findById: jest.fn(),
    findByMatchCriteriaBatch: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<IDonorRepository>;

  const mockTransactionDonorRepository: jest.Mocked<ITransactionDonorRepository> = {
    findByTransactionId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    replaceMany: jest.fn(),
    bulkUpsert: jest.fn(),
  } as unknown as jest.Mocked<ITransactionDonorRepository>;

  const mockTransactionManager: jest.Mocked<ITransactionManager> = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<ITransactionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionManager.execute.mockImplementation(async (fn) => {
      return fn({} as Parameters<Parameters<ITransactionManager["execute"]>[0]>[0]);
    });
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
    id: "1",
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

  const createMockDonor = (overrides: Partial<Donor> = {}): Donor => ({
    id: "1",
    tenantId: "1",
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createUsecase = () =>
    new ImportDonorCsvUsecase(
      mockCsvLoader,
      mockRecordConverter,
      mockValidator,
      mockTransactionRepository,
      mockDonorRepository,
      mockTransactionDonorRepository,
      mockTransactionManager,
    );

  it("should import valid rows and create new donors", async () => {
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow();
    const transaction = createMockTransaction();
    const createdDonor = createMockDonor();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockReturnValue([{ ...previewRow, status: "valid" }]);
    mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(1);
    expect(result.createdDonorCount).toBe(1);
    expect(mockDonorRepository.createMany).toHaveBeenCalledWith(
      [
        {
          name: "テスト太郎",
          address: "東京都渋谷区",
          donorType: "individual",
          occupation: "会社員",
          tenantId,
        },
      ],
      expect.anything(),
    );
    expect(mockTransactionDonorRepository.bulkUpsert).toHaveBeenCalledWith(
      [{ transactionId: BigInt(1), donorId: BigInt(1) }],
      expect.anything(),
    );
  });

  it("should throw NoValidRowsError when CSV is empty", async () => {
    mockCsvLoader.load.mockReturnValue([]);

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "",
      politicalOrganizationId: "org-123",
    };

    await expect(usecase.execute(input)).rejects.toThrow(NoValidRowsError);
  });

  it("should throw NoValidRowsError when no valid rows exist", async () => {
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow({ status: "invalid" });
    const transaction = createMockTransaction();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockReturnValue([{ ...previewRow, status: "invalid" }]);

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    await expect(usecase.execute(input)).rejects.toThrow(NoValidRowsError);
  });

  it("should reuse existing donors when matchingDonor is present", async () => {
    const existingDonor = createMockDonor({ id: "100" });
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow({
      matchingDonor: {
        id: existingDonor.id,
        name: existingDonor.name,
        donorType: existingDonor.donorType,
        address: existingDonor.address,
      },
    });
    const transaction = createMockTransaction();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([existingDonor]);
    mockValidator.validate.mockReturnValue([{ ...previewRow, status: "valid" }]);
    mockDonorRepository.createMany.mockResolvedValue([]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(1);
    expect(result.createdDonorCount).toBe(0);
    expect(mockDonorRepository.createMany).toHaveBeenCalledWith([], expect.anything());
    expect(mockTransactionDonorRepository.bulkUpsert).toHaveBeenCalledWith(
      [{ transactionId: BigInt(1), donorId: BigInt(100) }],
      expect.anything(),
    );
  });

  it("should use last row when duplicate transaction_no exists (last row wins)", async () => {
    const csvRecords = [
      createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001", name: "最初の太郎" }),
      createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0001", name: "最後の太郎" }),
    ];
    const previewRows = [
      createMockRow({ rowNumber: 1, transactionNo: "T2025-0001", name: "最初の太郎" }),
      createMockRow({ rowNumber: 2, transactionNo: "T2025-0001", name: "最後の太郎" }),
    ];
    const transaction = createMockTransaction();
    const createdDonor = createMockDonor({ name: "最後の太郎" });

    mockCsvLoader.load.mockReturnValue(csvRecords);
    mockRecordConverter.convert
      .mockReturnValueOnce(previewRows[0])
      .mockReturnValueOnce(previewRows[1]);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockImplementation((rows) =>
      rows.map((row) => ({ ...row, status: "valid" as const })),
    );
    mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(1);
    expect(mockDonorRepository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "最後の太郎" })]),
      expect.anything(),
    );
  });

  it("should deduplicate donors by name+address+donorType", async () => {
    const csvRecords = [
      createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001" }),
      createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0002" }),
    ];
    const previewRows = [
      createMockRow({ rowNumber: 1, transactionNo: "T2025-0001" }),
      createMockRow({ rowNumber: 2, transactionNo: "T2025-0002" }),
    ];
    const transactions = [
      createMockTransaction({ id: "1", transactionNo: "T2025-0001" }),
      createMockTransaction({ id: "2", transactionNo: "T2025-0002" }),
    ];
    const createdDonor = createMockDonor();

    mockCsvLoader.load.mockReturnValue(csvRecords);
    mockRecordConverter.convert
      .mockReturnValueOnce(previewRows[0])
      .mockReturnValueOnce(previewRows[1]);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue(transactions);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockImplementation((rows) =>
      rows.map((row) => ({ ...row, status: "valid" as const })),
    );
    mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(2);
    expect(result.createdDonorCount).toBe(1);
    expect(mockDonorRepository.createMany).toHaveBeenCalledWith(
      [
        {
          name: "テスト太郎",
          address: "東京都渋谷区",
          donorType: "individual",
          occupation: "会社員",
          tenantId,
        },
      ],
      expect.anything(),
    );
    expect(mockTransactionDonorRepository.bulkUpsert).toHaveBeenCalledWith(
      [
        { transactionId: BigInt(1), donorId: BigInt(1) },
        { transactionId: BigInt(2), donorId: BigInt(1) },
      ],
      expect.anything(),
    );
  });

  it("should handle mix of new and existing donors", async () => {
    const existingDonor = createMockDonor({ id: "100", name: "既存太郎" });
    const csvRecords = [
      createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001", name: "既存太郎" }),
      createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0002", name: "新規太郎" }),
    ];
    const previewRows = [
      createMockRow({
        rowNumber: 1,
        transactionNo: "T2025-0001",
        name: "既存太郎",
        matchingDonor: {
          id: existingDonor.id,
          name: existingDonor.name,
          donorType: existingDonor.donorType,
          address: existingDonor.address,
        },
      }),
      createMockRow({ rowNumber: 2, transactionNo: "T2025-0002", name: "新規太郎" }),
    ];
    const transactions = [
      createMockTransaction({ id: "1", transactionNo: "T2025-0001" }),
      createMockTransaction({ id: "2", transactionNo: "T2025-0002" }),
    ];
    const newDonor = createMockDonor({ id: "101", name: "新規太郎" });

    mockCsvLoader.load.mockReturnValue(csvRecords);
    mockRecordConverter.convert
      .mockReturnValueOnce(previewRows[0])
      .mockReturnValueOnce(previewRows[1]);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue(transactions);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([existingDonor]);
    mockValidator.validate.mockImplementation((rows) =>
      rows.map((row) => ({ ...row, status: "valid" as const })),
    );
    mockDonorRepository.createMany.mockResolvedValue([newDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(2);
    expect(result.createdDonorCount).toBe(1);
  });

  it("should execute all operations within a transaction", async () => {
    const csvRecord = createMockCsvRecord();
    const previewRow = createMockRow();
    const transaction = createMockTransaction();
    const createdDonor = createMockDonor();

    mockCsvLoader.load.mockReturnValue([csvRecord]);
    mockRecordConverter.convert.mockReturnValue(previewRow);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockReturnValue([{ ...previewRow, status: "valid" }]);
    mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    await usecase.execute(input);

    expect(mockTransactionManager.execute).toHaveBeenCalledTimes(1);
  });

  it("should skip rows with transaction_not_found status", async () => {
    const csvRecords = [
      createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001" }),
      createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0002" }),
    ];
    const previewRows = [
      createMockRow({ rowNumber: 1, transactionNo: "T2025-0001" }),
      createMockRow({ rowNumber: 2, transactionNo: "T2025-0002" }),
    ];
    const transaction = createMockTransaction({ id: "1", transactionNo: "T2025-0001" });
    const createdDonor = createMockDonor();

    mockCsvLoader.load.mockReturnValue(csvRecords);
    mockRecordConverter.convert
      .mockReturnValueOnce(previewRows[0])
      .mockReturnValueOnce(previewRows[1]);
    mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
    mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
    mockValidator.validate.mockImplementation((rows) => [
      { ...rows[0], status: "valid" as const },
      { ...rows[1], status: "transaction_not_found" as const },
    ]);
    mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
    mockTransactionDonorRepository.bulkUpsert.mockResolvedValue();

    const usecase = createUsecase();

    const input: ImportDonorCsvInput = {
      tenantId,
      csvContent: "dummy csv content",
      politicalOrganizationId: "org-123",
    };

    const result = await usecase.execute(input);

    expect(result.importedCount).toBe(1);
    expect(mockTransactionDonorRepository.bulkUpsert).toHaveBeenCalledWith(
      [{ transactionId: BigInt(1), donorId: BigInt(1) }],
      expect.anything(),
    );
  });
});
