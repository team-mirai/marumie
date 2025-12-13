import { readFileSync } from "fs";
import { join } from "path";
import {
  SavePreviewTransactionsUsecase,
  type SavePreviewTransactionsInput,
} from "@/server/contexts/data-import/application/usecases/save-preview-transactions-usecase";
import {
  PreviewMfCsvUsecase,
  type PreviewMfCsvInput,
} from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import type { ITransactionRepository } from "@/server/repositories/interfaces/transaction-repository.interface";
import type { CreateTransactionInput } from "@/server/domain/types/transaction";

describe("SavePreviewTransactionsUsecase", () => {
  let usecase: SavePreviewTransactionsUsecase;
  let previewUsecase: PreviewMfCsvUsecase;
  let mockRepository: jest.Mocked<Pick<ITransactionRepository, 'createMany' | 'updateMany' | 'findByTransactionNos'>>;

  beforeEach(() => {
    mockRepository = {
      createMany: jest.fn(),
      updateMany: jest.fn(),
      findByTransactionNos: jest.fn().mockResolvedValue([]),
    };
    usecase = new SavePreviewTransactionsUsecase(mockRepository as unknown as ITransactionRepository);
    previewUsecase = new PreviewMfCsvUsecase(mockRepository as unknown as ITransactionRepository);
  });

  describe("execute with sample data", () => {
    it("should process sample CSV and calculate correct expense/income/other totals", async () => {
      // テスト用サンプルデータを読み込み
      const sampleCsvPath = join(__dirname, "../../../../../data/sampledata.csv");
      const csvContent = readFileSync(sampleCsvPath, "utf-8");

      // PreviewUsecaseでvalidTransactionsを取得
      const previewInput: PreviewMfCsvInput = {
        csvContent,
        politicalOrganizationId: "test-org-id",
      };
      const previewResult = await previewUsecase.execute(previewInput);

      // Repositoryのモック設定
      const capturedTransactions: CreateTransactionInput[] = [];
      mockRepository.createMany.mockImplementation(
        async (transactions) => {
          capturedTransactions.push(...transactions);
          return transactions.map(t => ({ ...t, id: 'test-id', label: t.label || '', hash: t.hash, created_at: new Date(), updated_at: new Date() }));
        }
      );

      const input: SavePreviewTransactionsInput = {
        validTransactions: previewResult.transactions,
        politicalOrganizationId: "test-org-id",
      };

      // Usecase実行
      const result = await usecase.execute(input);

      // 基本的な結果検証
      expect(result.errors).toEqual([]);
      expect(result.processedCount).toBeGreaterThan(0);
      expect(result.savedCount).toBe(result.processedCount);

      // 取引種別ごとの金額集計
      const expenseTotal = capturedTransactions
        .filter((t) => t.transaction_type === "expense")
        .reduce((sum, t) => sum + t.debit_amount, 0);

      const incomeTotal = capturedTransactions
        .filter((t) => t.transaction_type === "income")
        .reduce((sum, t) => sum + t.credit_amount, 0);

      const otherTotal = capturedTransactions
        .filter((t) => t.transaction_type === "offset_income" || t.transaction_type === "offset_expense")
        .reduce((sum, t) => sum + Math.max(t.debit_amount, t.credit_amount), 0);

      // サンプルデータから期待値を計算
      // income: 普通預金が借方（寄附収入）= 12,252,423円
      // expense: 普通預金が貸方（支出）= 10,058,725円
      // other: 普通預金以外の取引 = 0円（サンプルデータには該当なし）
      expect(incomeTotal).toBe(12252423);
      expect(expenseTotal).toBe(10058725);
      expect(otherTotal).toBe(0);

      // Repository呼び出し検証
      expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
      expect(mockRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            political_organization_id: "test-org-id",
            transaction_type: expect.stringMatching(/^(income|expense|offset_income|offset_expense)$/),
          }),
        ])
      );
    });

    it("should handle empty CSV content", async () => {
      const input: SavePreviewTransactionsInput = {
        validTransactions: [],
        politicalOrganizationId: "test-org-id",
      };

      const result = await usecase.execute(input);

      expect(result.processedCount).toBe(0);
      expect(result.savedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.errors).toEqual(["有効なトランザクションがありません"]);
      expect(mockRepository.createMany).not.toHaveBeenCalled();
    });

    it("should handle repository errors gracefully", async () => {
      const sampleCsvPath = join(__dirname, "../../../../../data/sampledata.csv");
      const csvContent = readFileSync(sampleCsvPath, "utf-8");

      // PreviewUsecaseでvalidTransactionsを取得
      const previewInput: PreviewMfCsvInput = {
        csvContent,
        politicalOrganizationId: "test-org-id",
      };
      const previewResult = await previewUsecase.execute(previewInput);

      mockRepository.createMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      const input: SavePreviewTransactionsInput = {
        validTransactions: previewResult.transactions,
        politicalOrganizationId: "test-org-id",
      };

      const result = await usecase.execute(input);

      expect(result.errors).toContain("データの保存中にエラーが発生しました");
      expect(result.savedCount).toBe(0);
    });

    it("should reject invalid account labels and not call repository", async () => {
      // 有効と無効のアカウントラベルを含む2行のCSV
      const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額,貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額,摘要,仕訳メモ,タグ
1,2025/6/1,人件費,,,,,,1000,普通預金,,,,,,1000,給与支払,,人件費
2,2025/6/2,無効な科目,,,,,,2000,普通預金,,,,,,2000,無効な取引,,その他`;

      // PreviewUsecaseでvalidTransactionsを取得（エラーを含む）
      const previewInput: PreviewMfCsvInput = {
        csvContent,
        politicalOrganizationId: "test-org-id",
      };
      const previewResult = await previewUsecase.execute(previewInput);

      const input: SavePreviewTransactionsInput = {
        validTransactions: previewResult.transactions,
        politicalOrganizationId: "test-org-id",
      };

      // createManyのモック設定を追加
      mockRepository.createMany.mockResolvedValue(
        previewResult.transactions
          .filter(t => t.status === 'insert')
          .map(t => ({
            id: 'test-id',
            political_organization_id: t.political_organization_id,
            transaction_no: t.transaction_no,
            transaction_date: new Date(t.transaction_date),
            financial_year: new Date(t.transaction_date).getFullYear(),
            transaction_type: t.transaction_type!,
            debit_account: t.debit_account,
            debit_sub_account: t.debit_sub_account || '',
            debit_department: '',
            debit_partner: '',
            debit_tax_category: '',
            debit_amount: t.debit_amount,
            credit_account: t.credit_account,
            credit_sub_account: t.credit_sub_account || '',
            credit_department: '',
            credit_partner: '',
            credit_tax_category: '',
            credit_amount: t.credit_amount,
            description: t.description || '',
            friendly_category: t.friendly_category,
            memo: '',
            category_key: t.category_key,
            label: '',
            hash: '',
            created_at: new Date(),
            updated_at: new Date()
          }))
      );

      const result = await usecase.execute(input);

      // 無効な取引があるため有効な取引のみ処理される
      const validTransactionCount = previewResult.transactions.filter(t => t.status === 'insert').length;
      expect(result.processedCount).toBe(previewResult.transactions.length);
      expect(result.savedCount).toBe(validTransactionCount);

      // Repositoryは有効な取引がある場合のみ呼び出される
      if (validTransactionCount > 0) {
        expect(mockRepository.createMany).toHaveBeenCalled();
      } else {
        expect(mockRepository.createMany).not.toHaveBeenCalled();
      }
    });

    it("should handle duplicate transaction_no within same political organization", async () => {
      // 同じtransaction_noを持つが内容が異なるCSVデータ（updateとinsertの組み合わせ）
      const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額,貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額,摘要,仕訳メモ,タグ
TXN-001,2025/6/1,人件費,,,,,,1000,普通預金,,,,,,1000,給与支払1,,人件費
TXN-001,2025/6/2,人件費,,,,,,2000,普通預金,,,,,,2000,給与支払2,,人件費`;

      // 既存データとして同じtransaction_noが存在することをモック
      mockRepository.findByTransactionNos.mockResolvedValue([{
        id: 'existing-id',
        political_organization_id: '1',
        transaction_no: 'TXN-001',
        transaction_date: new Date('2025-06-01'),
        financial_year: 2025,
        transaction_type: 'expense',
        debit_account: '人件費',
        debit_sub_account: '',
        debit_department: '',
        debit_partner: '',
        debit_tax_category: '',
        debit_amount: 1000,
        credit_account: '普通預金',
        credit_sub_account: '',
        credit_department: '',
        credit_partner: '',
        credit_tax_category: '',
        credit_amount: 1000,
        description: '給与支払1',
        friendly_category: '',
        memo: '',
        category_key: '人件費',
        label: '',
        hash: 'different-hash', // 異なるハッシュを設定してupdateになるようにする
        created_at: new Date(),
        updated_at: new Date()
      }]);

      // Mock repository methods
      mockRepository.createMany.mockImplementation(
        async (transactions) => {
          return transactions.map((t, index) => ({
            ...t,
            id: `new-id-${index}`,
            label: t.label || '',
            hash: t.hash,
            created_at: new Date(),
            updated_at: new Date()
          }));
        }
      );

      mockRepository.updateMany.mockImplementation(
        async (updateData) => {
          return updateData.map((_, index) => ({
            id: `updated-id-${index}`,
            political_organization_id: '1',
            transaction_no: 'TXN-001',
            transaction_date: new Date(),
            financial_year: 2025,
            transaction_type: 'expense' as const,
            debit_account: '人件費',
            debit_sub_account: '',
            debit_amount: 1000,
            credit_account: '普通預金',
            credit_sub_account: '',
            credit_amount: 1000,
            description: 'updated',
            friendly_category: '',
            memo: '',
            category_key: '人件費',
            label: '',
            hash: 'updated-hash',
            created_at: new Date(),
            updated_at: new Date()
          }));
        }
      );

      // Mock the refreshWebappCache method to prevent HTTP requests in tests
      jest.spyOn(usecase as any, 'refreshWebappCache').mockResolvedValue(undefined);

      const previewInput: PreviewMfCsvInput = {
        csvContent,
        politicalOrganizationId: "1",
      };
      const previewResult = await previewUsecase.execute(previewInput);

      const input: SavePreviewTransactionsInput = {
        validTransactions: previewResult.transactions,
        politicalOrganizationId: "1",
      };

      const result = await usecase.execute(input);


      // 両方ともupdateステータス（同じtransaction_noに対して複数のupdateが発生）
      expect(result.processedCount).toBe(2);
      expect(result.savedCount).toBe(2);
      expect(result.skippedCount).toBe(0);

      // 両方ともupdateなので、updateManyのみが呼ばれる
      expect(mockRepository.updateMany).toHaveBeenCalled();
      expect(mockRepository.createMany).not.toHaveBeenCalled();
      
      // findByTransactionNosが正しい引数で呼ばれることを確認
      expect(mockRepository.findByTransactionNos).toHaveBeenCalledWith(
        ["TXN-001", "TXN-001"],
        ["1"]
      );
    });

    it("should allow same transaction_no for different political organizations", async () => {
      const csvContent = `取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額,貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額,摘要,仕訳メモ,タグ
TXN-001,2025/6/1,人件費,,,,,,1000,普通預金,,,,,,1000,給与支払,,人件費`;

      // 異なる政治団体では重複なし
      mockRepository.findByTransactionNos.mockResolvedValue([]);
      
      // createManyのモック設定
      mockRepository.createMany.mockResolvedValue([
        {
          id: 'test-id',
          political_organization_id: "different-org-id",
          transaction_no: "TXN-001",
          transaction_date: new Date('2025-06-01'),
          financial_year: 2025,
          transaction_type: 'expense',
          debit_account: '人件費',
          debit_sub_account: '',
          debit_department: '',
          debit_partner: '',
          debit_tax_category: '',
          debit_amount: 1000,
          credit_account: '普通預金',
          credit_sub_account: '',
          credit_department: '',
          credit_partner: '',
          credit_tax_category: '',
          credit_amount: 1000,
          description: '給与支払',
          friendly_category: '',
          memo: '',
          category_key: '人件費',
          label: '',
          hash: '',
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const previewInput: PreviewMfCsvInput = {
        csvContent,
        politicalOrganizationId: "different-org-id",
      };
      const previewResult = await previewUsecase.execute(previewInput);

      const input: SavePreviewTransactionsInput = {
        validTransactions: previewResult.transactions,
        politicalOrganizationId: "different-org-id",
      };

      const result = await usecase.execute(input);

      // 異なる政治団体では正常に保存されるはず
      expect(result.processedCount).toBe(1);
      expect(result.savedCount).toBe(1);
      expect(result.skippedCount).toBe(0);
      expect(result.errors).toEqual([]);
      
      // repositoryが呼ばれることを確認
      expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
      expect(mockRepository.findByTransactionNos).toHaveBeenCalledWith(
        ["TXN-001"],
        ["different-org-id"]
      );
    });
  });
});
