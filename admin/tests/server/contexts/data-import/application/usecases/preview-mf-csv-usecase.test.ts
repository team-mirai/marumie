import {
  PreviewMfCsvUsecase,
  type PreviewMfCsvInput,
} from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import { MfCsvLoader } from "@/server/contexts/data-import/infrastructure/mf/mf-csv-loader";
import { MfRecordConverter } from "@/server/contexts/data-import/infrastructure/mf/mf-record-converter";
import { TransactionValidator } from "@/server/contexts/data-import/domain/services/transaction-validator";
import type { ITransactionRepository } from "@/server/contexts/shared/domain/repositories/transaction-repository.interface";

describe("PreviewMfCsvUsecase", () => {
  const mockTransactionRepository: jest.Mocked<ITransactionRepository> = {
    findWithPagination: jest.fn(),
    updateMany: jest.fn(),
    deleteAll: jest.fn(),
    createMany: jest.fn(),
    findByTransactionNos: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionRepository.findByTransactionNos.mockResolvedValue([]);
  });

  it("processes CSV content and returns preview result", async () => {
    const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新
1,2025/6/6,普通預金,【公人】テスト銀行,対象外,,1500000,0,寄附金,,対象外,,1500000,0,拠出 テスト太郎,テスト太郎,,,,,,`;

    const input: PreviewMfCsvInput = {
      csvContent,
      politicalOrganizationId: "org-123",
    };

    const usecase = new PreviewMfCsvUsecase(mockTransactionRepository);
    const result = await usecase.execute(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].transaction_no).toBe("1");
    expect(result.transactions[0].political_organization_id).toBe("org-123");
    expect(result.summary).toBeDefined();
    expect(result.statistics).toBeDefined();
  });

  it("returns empty result for empty CSV", async () => {
    const input: PreviewMfCsvInput = {
      csvContent: "",
      politicalOrganizationId: "org-123",
    };

    const usecase = new PreviewMfCsvUsecase(mockTransactionRepository);
    const result = await usecase.execute(input);

    expect(result.transactions).toHaveLength(0);
    expect(result.summary.totalCount).toBe(0);
  });

  it("returns empty result when CSV parsing fails", async () => {
    const invalidCsvContent = "invalid,csv\nwithout,proper,headers";

    const input: PreviewMfCsvInput = {
      csvContent: invalidCsvContent,
      politicalOrganizationId: "org-123",
    };

    const usecase = new PreviewMfCsvUsecase(mockTransactionRepository);
    const result = await usecase.execute(input);

    expect(result.transactions).toHaveLength(0);
  });

  it("detects existing transactions as duplicates", async () => {
    // 有効な勘定科目を使用: 普通預金（BS）、個人からの寄附（PL）
    const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新
1,2025/6/6,普通預金,【公人】テスト銀行,対象外,,100000,0,個人からの寄附,,対象外,,100000,0,テスト,タグ,,,,,,`;

    // Mock existing transaction with different hash (will be update)
    mockTransactionRepository.findByTransactionNos.mockResolvedValue([
      {
        id: "1",
        political_organization_id: "123",
        transaction_no: "1",
        transaction_date: new Date("2025-06-06"),
        financial_year: 2025,
        transaction_type: "income",
        debit_account: "普通預金",
        debit_sub_account: "【公人】テスト銀行",
        debit_amount: 100000,
        credit_account: "個人からの寄附",
        credit_sub_account: undefined,
        credit_amount: 100000,
        description: "テスト",
        label: "",
        memo: undefined,
        friendly_category: "タグ",
        category_key: "individual-donations",
        hash: "different-hash", // Different hash triggers 'update' status
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const input: PreviewMfCsvInput = {
      csvContent,
      politicalOrganizationId: "123",
    };

    const usecase = new PreviewMfCsvUsecase(mockTransactionRepository);
    const result = await usecase.execute(input);

    expect(result.transactions).toHaveLength(1);
    // Status should be 'update' because transaction_no exists but hash differs
    expect(result.transactions[0].status).toBe("update");
  });

  it("uses custom dependencies when provided", async () => {
    const mockLoader = new MfCsvLoader();
    const mockConverter = new MfRecordConverter();
    const mockValidator = new TransactionValidator();

    const loadSpy = jest.spyOn(mockLoader, "load");

    const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方税区,借方部門,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方税区,貸方部門,貸方金額(円),貸方税額,摘要,起訖タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新
1,2025/7/1,現金,,対象外,,50000,0,雑収入,,対象外,,50000,0,テスト収入,収入,,,,,,`;

    const input: PreviewMfCsvInput = {
      csvContent,
      politicalOrganizationId: "org-456",
    };

    const usecase = new PreviewMfCsvUsecase(
      mockTransactionRepository,
      mockLoader,
      mockConverter,
      mockValidator,
    );

    await usecase.execute(input);

    expect(loadSpy).toHaveBeenCalledWith(csvContent);
  });
});
