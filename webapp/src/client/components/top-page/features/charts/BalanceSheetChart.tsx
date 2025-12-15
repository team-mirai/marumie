"use client";

import type { BalanceSheetData } from "@/types/balance-sheet";
import { BALANCE_SHEET_LABELS } from "@/types/balance-sheet";

interface BalanceSheetChartProps {
  data: BalanceSheetData;
}

// 色定数
const COLORS = {
  CURRENT_ASSETS: "#5EEAD4",
  FIXED_ASSETS: "#2DD4BF",
  DEBT_EXCESS: "#DC2626",
  DEBT_EXCESS_STROKE: "#B91C1C",
  CURRENT_LIABILITIES: "#FECACA",
  FIXED_LIABILITIES: "#F87171",
  NET_ASSETS: "#22D3EE",
} as const;

interface BalanceSheetItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
  isDebtExcess?: boolean;
}

export default function BalanceSheetChart({ data }: BalanceSheetChartProps) {
  // 金額フォーマット関数
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      const oku = Math.floor(amount / 100000000);
      const man = Math.floor((amount % 100000000) / 10000);
      return man > 0 ? `${oku}億${man}万円` : `${oku}億円`;
    } else if (amount >= 10000) {
      const man = Math.floor(amount / 10000);
      const en = amount % 10000;
      return en > 0 ? `${man}万${en}円` : `${man}万円`;
    }
    return `${amount}円`;
  };

  // 金額を数値と単位に分割して表示
  const renderFormattedAmount = (amount: number, isDebtExcess = false) => {
    const formatted = formatAmount(amount);
    const parts = formatted.split(/(\d+)/);

    return (
      <span className="inline-flex items-baseline gap-0.5">
        {isDebtExcess && <span className="text-sm font-bold text-red-600">▲</span>}
        {parts
          .map((part, index) => ({ part, index }))
          .filter(({ part }) => part !== "")
          .map(({ part, index }) => {
            const isNumber = /^\d+$/.test(part);
            return (
              <span
                key={`part-${index}-${part}`}
                className={isNumber ? "text-lg font-bold" : "text-xs font-medium"}
                style={{
                  fontFamily: isNumber
                    ? "'SF Pro', -apple-system, system-ui, sans-serif"
                    : "'Noto Sans JP', sans-serif",
                }}
              >
                {part}
              </span>
            );
          })}
      </span>
    );
  };

  // 左側（資産）の計算
  const leftTotal = data.left.currentAssets + data.left.fixedAssets + data.left.debtExcess;

  const leftItems: BalanceSheetItem[] = [
    {
      name: BALANCE_SHEET_LABELS.currentAssets,
      value: data.left.currentAssets,
      color: COLORS.CURRENT_ASSETS,
      percentage: (data.left.currentAssets / leftTotal) * 100,
    },
    {
      name: BALANCE_SHEET_LABELS.fixedAssets,
      value: data.left.fixedAssets,
      color: COLORS.FIXED_ASSETS,
      percentage: (data.left.fixedAssets / leftTotal) * 100,
    },
    {
      name: BALANCE_SHEET_LABELS.debtExcess,
      value: data.left.debtExcess,
      color: COLORS.DEBT_EXCESS,
      percentage: (data.left.debtExcess / leftTotal) * 100,
      isDebtExcess: true,
    },
  ].filter((item) => item.value > 0);

  // 右側（負債・資本）の計算
  const rightTotal =
    data.right.currentLiabilities + data.right.fixedLiabilities + data.right.netAssets;

  const rightItems: BalanceSheetItem[] = [
    {
      name: BALANCE_SHEET_LABELS.currentLiabilities,
      value: data.right.currentLiabilities,
      color: COLORS.CURRENT_LIABILITIES,
      percentage: (data.right.currentLiabilities / rightTotal) * 100,
    },
    {
      name: BALANCE_SHEET_LABELS.fixedLiabilities,
      value: data.right.fixedLiabilities,
      color: COLORS.FIXED_LIABILITIES,
      percentage: (data.right.fixedLiabilities / rightTotal) * 100,
    },
    {
      name: BALANCE_SHEET_LABELS.netAssets,
      value: data.right.netAssets,
      color: COLORS.NET_ASSETS,
      percentage: (data.right.netAssets / rightTotal) * 100,
    },
  ].filter((item) => item.value > 0);

  // アイテムのレンダリング
  const renderItem = (item: BalanceSheetItem) => {
    const isSmall = item.percentage < 16; // 高さが30px以下相当

    return (
      <div
        key={item.name}
        className={`flex flex-col items-center justify-center px-2 border cursor-pointer box-border ${
          item.isDebtExcess
            ? "bg-transparent border-dashed border-[#B91C1C]"
            : "border-solid border-white"
        }`}
        style={{
          backgroundColor: item.isDebtExcess ? undefined : item.color,
          height: `${item.percentage}%`,
        }}
      >
        {isSmall ? (
          // 小さい場合：一行表示
          <div className={`text-center ${item.isDebtExcess ? "text-red-600" : "text-black"}`}>
            <span
              className="text-sm font-bold"
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              {item.name}{" "}
            </span>
            {renderFormattedAmount(item.value, item.isDebtExcess)}
          </div>
        ) : (
          // 大きい場合：二行表示
          <>
            <div
              className={`text-base font-bold mb-1 ${item.isDebtExcess ? "text-red-600" : "text-black"}`}
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              {item.name}
            </div>
            <div className={item.isDebtExcess ? "text-red-600" : "text-black"}>
              {renderFormattedAmount(item.value, item.isDebtExcess)}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex justify-center mt-10">
      <div
        className="w-full max-w-[500px] flex gap-[1px] h-[380px]"
        role="img"
        aria-label="貸借対照表チャート"
      >
        {/* 左側（資産） */}
        <div className="flex-1 flex flex-col">{leftItems.map((item) => renderItem(item))}</div>

        {/* 右側（負債・資本） */}
        <div className="flex-1 flex flex-col">{rightItems.map((item) => renderItem(item))}</div>
      </div>
    </div>
  );
}
