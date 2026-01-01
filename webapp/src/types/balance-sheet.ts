export interface BalanceSheetData {
  left: {
    currentAssets: number; // 流動資産
    fixedAssets: number; // 固定資産
    debtExcess: number; // 債務超過 (存在しない場合は0)
  };
  right: {
    currentLiabilities: number; // 流動負債
    fixedLiabilities: number; // 固定負債
    netAssets: number; // 純資産 (存在しない場合は0)
  };
}

// 表示用のラベルマッピング
export const BALANCE_SHEET_LABELS = {
  currentAssets: "流動資産",
  fixedAssets: "固定資産",
  debtExcess: "債務超過",
  currentLiabilities: "流動負債",
  fixedLiabilities: "固定負債",
  netAssets: "純資産",
} as const;
