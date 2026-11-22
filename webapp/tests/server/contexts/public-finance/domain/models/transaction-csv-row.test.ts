import type { Transaction } from "@/shared/models/transaction";
import {
  TRANSACTION_CSV_HEADERS,
  toTransactionCsvRow,
} from "@/server/contexts/public-finance/domain/models/transaction-csv-row";

const createTransaction = (
  overrides: Partial<Transaction> = {},
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

describe("toTransactionCsvRow", () => {
  it("支出は借方の金額と科目を使う", () => {
    const row = toTransactionCsvRow(
      createTransaction({
        transaction_type: "expense",
        debit_account: "事務所費",
        debit_amount: 3000,
        credit_account: "普通預金",
        credit_amount: 9999,
      }),
    );

    expect(row).toEqual({
      date: "2025-08-15",
      politicalOrganizationName: "サンプル党",
      typeLabel: "支出",
      amount: 3000,
      account: "事務所費",
      friendlyCategory: "家賃",
      label: "8月分",
    });
  });

  it("収入は貸方の金額と科目を使う", () => {
    const row = toTransactionCsvRow(
      createTransaction({
        transaction_type: "income",
        debit_account: "普通預金",
        debit_amount: 9999,
        credit_account: "個人からの寄附",
        credit_amount: 5000,
      }),
    );

    expect(row.typeLabel).toBe("収入");
    expect(row.amount).toBe(5000);
    expect(row.account).toBe("個人からの寄附");
  });

  it("日付は UTC の YYYY-MM-DD にする", () => {
    const row = toTransactionCsvRow(
      createTransaction({ transaction_date: new Date("2025-12-31T23:30:00Z") }),
    );

    expect(row.date).toBe("2025-12-31");
  });
});

describe("TRANSACTION_CSV_HEADERS", () => {
  it("行の値と同じ並びの列見出しを持つ", () => {
    expect(TRANSACTION_CSV_HEADERS).toEqual([
      "日付",
      "政治団体名",
      "タイプ",
      "金額",
      "カテゴリ",
      "詳細区分",
      "ラベル",
    ]);
  });
});
