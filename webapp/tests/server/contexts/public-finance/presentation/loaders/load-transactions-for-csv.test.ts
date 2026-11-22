jest.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => fn,
}));
jest.mock("@/server/contexts/public-finance/infrastructure/prisma", () => ({
  prisma: {},
}));
jest.mock(
  "@/server/contexts/public-finance/infrastructure/repositories/prisma-transaction.repository",
  () => ({ PrismaTransactionRepository: jest.fn() }),
);
jest.mock(
  "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository",
  () => ({ PrismaPoliticalOrganizationRepository: jest.fn() }),
);
jest.mock("@/server/contexts/public-finance/application/usecases/get-transactions-for-csv-usecase", () => ({
  GetTransactionsForCsvUsecase: jest.fn(),
}));

import type { Transaction } from "@/shared/models/transaction";
import { GetTransactionsForCsvUsecase } from "@/server/contexts/public-finance/application/usecases/get-transactions-for-csv-usecase";
import { downloadTransactionsCsv } from "@/server/contexts/public-finance/presentation/loaders/load-transactions-for-csv";

const executeMock = jest.fn();
(GetTransactionsForCsvUsecase as jest.Mock).mockImplementation(() => ({ execute: executeMock }));

const createTransaction = (
  overrides: Partial<Transaction & { political_organization_name: string }> = {},
): Transaction & { political_organization_name: string } => ({
  id: "1",
  political_organization_id: "org-1",
  transaction_no: "T001",
  transaction_date: new Date("2025-08-15T00:00:00Z"),
  financial_year: 2025,
  transaction_type: "expense",
  debit_account: "事務所費",
  debit_amount: 3000,
  credit_account: "普通預金",
  credit_amount: 3000,
  friendly_category: "家賃",
  category_key: "office",
  label: "8月分",
  hash: "hash",
  created_at: new Date(),
  updated_at: new Date(),
  political_organization_name: "サンプル党",
  ...overrides,
});

describe("downloadTransactionsCsv", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("収入は貸方・支出は借方の金額と科目で、見出し付きの CSV を返す", async () => {
    executeMock.mockResolvedValue({
      transactions: [
        createTransaction({
          transaction_type: "income",
          debit_account: "普通預金",
          debit_amount: 9999,
          credit_account: "個人からの寄附",
          credit_amount: 5000,
          friendly_category: "寄附",
          label: "寄附 A",
        }),
        createTransaction({
          transaction_date: new Date("2025-08-01T00:00:00Z"),
          credit_amount: 9999,
        }),
      ],
      total: 2,
    });

    const result = await downloadTransactionsCsv("sample-party", 2025);

    expect(executeMock).toHaveBeenCalledWith({ slugs: ["sample-party"], financialYear: 2025 });
    expect(result.success).toBe(true);
    expect(result.data).toBe(
      [
        "日付,政治団体名,タイプ,金額,カテゴリ,詳細区分,ラベル",
        '2025-08-15,"サンプル党",収入,5000,"個人からの寄附","寄附","寄附 A"',
        '2025-08-01,"サンプル党",支出,3000,"事務所費","家賃","8月分"',
      ].join("\n"),
    );
    expect(result.filename).toMatch(/^transactions_sample-party_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("文字列の列はダブルクォートで囲み、中のダブルクォートを二重にする", async () => {
    executeMock.mockResolvedValue({
      transactions: [createTransaction({ label: 'say "hi", ok', political_organization_name: '党"A"' })],
      total: 1,
    });

    const result = await downloadTransactionsCsv("sample-party", 2025);

    expect(result.data?.split("\n")[1]).toBe(
      '2025-08-15,"党""A""",支出,3000,"事務所費","家賃","say ""hi"", ok"',
    );
  });

  it("取得に失敗したらエラーを返す", async () => {
    executeMock.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await downloadTransactionsCsv("sample-party", 2025);

    expect(result).toEqual({ success: false, error: "CSVのダウンロードに失敗しました" });
  });
});
