import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

/**
 * 調研費の支出 CSV。
 *
 * 画面（B-4）が月ごとに区切って見せるのに対し、CSV はその年度の published の支出を
 * 全件そのまま渡す。表示用の view から作るので、未公開の仕訳と備考（memo）は
 * 構造上ここに入り込まない。
 */
export const RESEARCH_FUND_CSV_HEADERS = [
  "日付",
  "カテゴリー",
  "法定区分",
  "項目",
  "金額",
  "特記事項",
  "分割グループ",
  "領収書",
] as const;

/** 領収書の有無は URL ではなく有無だけを載せる（配信は認可付きの API 経由のため）。 */
function receiptLabel(hasReceipt: boolean): string {
  return hasReceipt ? "あり" : "なし";
}

function escapeCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** 区切りは既存の取引 CSV に合わせた LF。UTF-8 BOM はダウンロード時に付ける。 */
export function buildResearchFundCsv(expenses: readonly ResearchFundExpenseView[]): string {
  const rows = [
    RESEARCH_FUND_CSV_HEADERS.map(escapeCell).join(","),
    ...expenses.map((expense) =>
      [
        expense.date,
        expense.detailed.label,
        expense.legal.label,
        expense.description,
        expense.amount,
        expense.note ?? "",
        expense.splitGroup ?? "",
        receiptLabel(expense.hasReceipt),
      ]
        .map(escapeCell)
        .join(","),
    ),
  ];

  return rows.join("\n");
}

/** 例: `research_fund_mineshima_2026.csv`。既存の取引 CSV と同じ snake_case の慣習に合わせる。 */
export function buildResearchFundCsvFilename(slug: string, financialYear: number): string {
  return `research_fund_${slug}_${financialYear}.csv`;
}
