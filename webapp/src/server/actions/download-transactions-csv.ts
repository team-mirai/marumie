"use server";

import { loadTransactionsForCsv } from "@/server/loaders/load-transactions-for-csv";

export async function downloadTransactionsCsv(slug: string) {
  try {
    // すべてのトランザクションを取得
    const data = await loadTransactionsForCsv({
      slugs: [slug],
      financialYear: 2025,
    });

    // CSVヘッダー
    const headers = ["日付", "政治団体名", "タイプ", "金額", "カテゴリ", "詳細区分", "ラベル"];

    // CSVデータを作成
    const csvRows = [
      headers.join(","),
      ...data.transactions.map((transaction) => {
        const row = [
          new Date(transaction.transaction_date).toISOString().split("T")[0],
          `"${transaction.political_organization_name.replace(/"/g, '""')}"`,
          transaction.transaction_type === "income" ? "収入" : "支出",
          transaction.transaction_type === "income"
            ? transaction.credit_amount.toString()
            : transaction.debit_amount.toString(),
          `"${(transaction.transaction_type === "income" ? transaction.credit_account : transaction.debit_account).replace(/"/g, '""')}"`,
          `"${transaction.friendly_category.replace(/"/g, '""')}"`,
          `"${transaction.label.replace(/"/g, '""')}"`,
        ];
        return row.join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");

    // ダウンロード用のレスポンスを返す
    const now = new Date();
    const timestamp = now.toISOString().split("T")[0];
    const filename = `transactions_${slug}_${timestamp}.csv`;

    return {
      success: true,
      data: csvContent,
      filename,
    };
  } catch (error) {
    console.error("CSV download error:", error);
    return {
      success: false,
      error: "CSVのダウンロードに失敗しました",
    };
  }
}
