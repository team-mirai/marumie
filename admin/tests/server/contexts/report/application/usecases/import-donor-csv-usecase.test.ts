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
import type { DonorCsvRecord } from "@/server/contexts/report/infrastructure/donor-csv/donor-csv-record";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import { NoValidRowsError } from "@/server/contexts/report/domain/errors/donor-csv-error";

describe("ImportDonorCsvUsecase", () => {
  const mockCsvLoader: jest.Mocked<IDonorCsvLoader> = {
    load: jest.fn(),
  };

  const mockRecordConverter: jest.Mocked<IDonorCsvRecordConverter> = {
    convert: jest.fn(),
  };

  const mockValidator: jest.Mocked<IDonorCsvValidator> = {
    validate: jest.fn(),
  };

  const mockTransactionRepository: jest.Mocked<ITransactionWithDonorRepository> = {
    findByTransactionNosForDonorCsv: jest.fn(),
    findTransactionsWithDonors: jest.fn(),
    findByDonor: jest.fn(),
    existsById: jest.fn(),
    findExistingIds: jest.fn(),
    findByIdWithDonor: jest.fn(),
    findByIdsWithDonor: jest.fn(),
  };

  const mockDonorRepository: jest.Mocked<IDonorRepository> = {
    findById: jest.fn(),
    findByIds: jest.fn(),
    findByNameAddressAndType: jest.fn(),
    findAll: jest.fn(),
    findAllWithUsage: jest.fn(),
    findByType: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getUsageCount: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
    findByUsageFrequency: jest.fn(),
    findByPartnerName: jest.fn(),
    findByMatchCriteriaBatch: jest.fn(),
  };

  const mockTransactionDonorRepository: jest.Mocked<ITransactionDonorRepository> = {
    findByTransactionId: jest.fn(),
    upsert: jest.fn(),
    deleteByTransactionId: jest.fn(),
    deleteByTransactionIds: jest.fn(),
    createMany: jest.fn(),
    replaceMany: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockCsvRecord = (overrides: Partial<DonorCsvRecord> = {}): DonorCsvRecord => ({
    rowNumber: 1,
    transaction_no: "T2025-0001",
    name: "テスト太郎",
    donorType: "individual",
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
    );

  describe("正常系", () => {
    it("valid行のみがインポートされる", async () => {
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
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
      expect(result.createdDonorCount).toBe(1);
      expect(mockTransactionDonorRepository.replaceMany).toHaveBeenCalled();
    });

    it("新規Donorが作成される", async () => {
      const csvRecord = createMockCsvRecord();
      const previewRow = createMockRow({ matchingDonor: null });
      const transaction = createMockTransaction();
      const createdDonor = createMockDonor();

      mockCsvLoader.load.mockReturnValue([csvRecord]);
      mockRecordConverter.convert.mockReturnValue(previewRow);
      mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
      mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
      mockValidator.validate.mockReturnValue([{ ...previewRow, status: "valid" }]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.createdDonorCount).toBe(1);
      expect(mockDonorRepository.createMany).toHaveBeenCalledWith([
        {
          donorType: "individual",
          name: "テスト太郎",
          address: "東京都渋谷区",
          occupation: "会社員",
        },
      ]);
    });

    it("既存Donorが再利用される（matchingDonorあり）", async () => {
      const existingDonor = createMockDonor({ id: "100" });
      const csvRecord = createMockCsvRecord();
      const previewRow = createMockRow({
        matchingDonor: {
          id: "100",
          name: "テスト太郎",
          donorType: "individual",
          address: "東京都渋谷区",
        },
      });
      const transaction = createMockTransaction();

      mockCsvLoader.load.mockReturnValue([csvRecord]);
      mockRecordConverter.convert.mockReturnValue(previewRow);
      mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
      mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([existingDonor]);
      mockValidator.validate.mockReturnValue([
        {
          ...previewRow,
          status: "valid",
          matchingDonor: {
            id: "100",
            name: "テスト太郎",
            donorType: "individual",
            address: "東京都渋谷区",
          },
        },
      ]);
      mockDonorRepository.findByIds.mockResolvedValue([existingDonor]);
      mockDonorRepository.createMany.mockResolvedValue([]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
      expect(result.createdDonorCount).toBe(0);
      expect(mockDonorRepository.createMany).not.toHaveBeenCalled();
    });
  });

  describe("後勝ち処理", () => {
    it("同一transaction_noは最後の行が採用される", async () => {
      const csvRecords = [
        createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001", name: "山田太郎" }),
        createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0001", name: "山田花子" }),
      ];
      const previewRows = [
        createMockRow({ rowNumber: 1, transactionNo: "T2025-0001", name: "山田太郎" }),
        createMockRow({ rowNumber: 2, transactionNo: "T2025-0001", name: "山田花子" }),
      ];
      const transaction = createMockTransaction({ id: "1", transactionNo: "T2025-0001" });
      const createdDonor = createMockDonor({ name: "山田花子" });

      mockCsvLoader.load.mockReturnValue(csvRecords);
      mockRecordConverter.convert
        .mockReturnValueOnce(previewRows[0])
        .mockReturnValueOnce(previewRows[1]);
      mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue([transaction]);
      mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
      mockValidator.validate.mockReturnValue([
        { ...previewRows[0], status: "valid" },
        { ...previewRows[1], status: "valid" },
      ]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
      expect(mockDonorRepository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: "山田花子" }),
      ]);
    });
  });

  describe("重複除去", () => {
    it("同一Donor（name + address + donorType）は1回のみ作成", async () => {
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
      mockValidator.validate.mockReturnValue([
        { ...previewRows[0], status: "valid" },
        { ...previewRows[1], status: "valid" },
      ]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(2);
      expect(result.createdDonorCount).toBe(1);
      expect(mockDonorRepository.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("エラー処理", () => {
    it("valid行が0件の場合は例外をスロー", async () => {
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
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      await expect(usecase.execute(input)).rejects.toThrow(NoValidRowsError);
    });

    it("空のCSVの場合は例外をスロー", async () => {
      mockCsvLoader.load.mockReturnValue([]);

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "",
        politicalOrganizationId: "org-123",
      };

      await expect(usecase.execute(input)).rejects.toThrow(NoValidRowsError);
    });
  });

  describe("invalid/transaction_not_found/type_mismatch行のスキップ", () => {
    it("invalid行はスキップされる", async () => {
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
      mockValidator.validate.mockReturnValue([
        { ...previewRows[0], status: "valid" },
        { ...previewRows[1], status: "invalid", errors: ["エラー"] },
      ]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
    });

    it("transaction_not_found行はスキップされる", async () => {
      const csvRecords = [
        createMockCsvRecord({ rowNumber: 1, transaction_no: "T2025-0001" }),
        createMockCsvRecord({ rowNumber: 2, transaction_no: "T2025-0002" }),
      ];
      const previewRows = [
        createMockRow({ rowNumber: 1, transactionNo: "T2025-0001" }),
        createMockRow({ rowNumber: 2, transactionNo: "T2025-0002" }),
      ];
      const transactions = [createMockTransaction({ id: "1", transactionNo: "T2025-0001" })];
      const createdDonor = createMockDonor();

      mockCsvLoader.load.mockReturnValue(csvRecords);
      mockRecordConverter.convert
        .mockReturnValueOnce(previewRows[0])
        .mockReturnValueOnce(previewRows[1]);
      mockTransactionRepository.findByTransactionNosForDonorCsv.mockResolvedValue(transactions);
      mockDonorRepository.findByMatchCriteriaBatch.mockResolvedValue([]);
      mockValidator.validate.mockReturnValue([
        { ...previewRows[0], status: "valid" },
        { ...previewRows[1], status: "transaction_not_found", errors: ["取引が見つかりません"] },
      ]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
    });

    it("type_mismatch行はスキップされる", async () => {
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
      mockValidator.validate.mockReturnValue([
        { ...previewRows[0], status: "valid" },
        { ...previewRows[1], status: "type_mismatch", errors: ["種別不整合"] },
      ]);
      mockDonorRepository.createMany.mockResolvedValue([createdDonor]);
      mockTransactionDonorRepository.replaceMany.mockResolvedValue();

      const usecase = createUsecase();
      const input: ImportDonorCsvInput = {
        csvContent: "dummy csv content",
        politicalOrganizationId: "org-123",
      };

      const result = await usecase.execute(input);

      expect(result.importedCount).toBe(1);
    });
  });
});
