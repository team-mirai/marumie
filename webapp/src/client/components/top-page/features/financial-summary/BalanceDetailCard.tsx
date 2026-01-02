import type { ReactElement } from "react";
import type { FormattedAmount } from "@/client/lib/financial-calculator";

interface BalanceDetailCardProps {
  className?: string;
  balance: FormattedAmount;
  cashBalance: FormattedAmount;
  unpaidExpense: FormattedAmount;
}

interface BalanceItem {
  label: string;
  amount: FormattedAmount;
}

// FormattedAmountを表示用JSXに変換する関数
function formatAmountDisplay(amount: FormattedAmount, isLarge: boolean = false): ReactElement {
  const mainClass = isLarge
    ? "text-gray-800 font-bold font-sf-pro"
    : "text-gray-600 font-bold font-sf-pro";
  const unitClass = isLarge
    ? "text-gray-500 font-bold text-xs sm:text-base leading-none"
    : "text-gray-500 font-bold text-xs leading-4";

  if (amount.tertiary) {
    return (
      <span className="flex items-baseline gap-1">
        <span className={mainClass}>{amount.main}</span>
        <span className={unitClass}>{amount.secondary}</span>
        <span className={mainClass}>{amount.tertiary}</span>
        <span className={unitClass}>{amount.unit}</span>
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-1">
      <span className={mainClass}>{amount.main}</span>
      <span className={unitClass}>
        {amount.secondary}
        {amount.unit}
      </span>
    </span>
  );
}

export default function BalanceDetailCard({
  className,
  balance,
  cashBalance,
  unpaidExpense,
}: BalanceDetailCardProps) {
  const mainBalance = {
    title: "収支",
    amount: balance,
  };

  const balanceItems: BalanceItem[] = [
    {
      label: "現金残高",
      amount: cashBalance,
    },
  ];

  // 未払費用が0でない場合のみ追加
  if (unpaidExpense.main !== "0") {
    balanceItems.push({
      label: "未払費用",
      amount: unpaidExpense,
    });
  }

  const getBalanceItemKey = (item: BalanceItem) => `${item.label}-${item.amount.main}`;

  return (
    <div className={`border border-gray-200 rounded-2xl py-4 px-5 sm:py-5 sm:px-6 ${className}`}>
      {/* デスクトップ版レイアウト */}
      <div className="hidden sm:flex flex-row items-end gap-4">
        {/* メイン収支セクション */}
        <div className="flex flex-col justify-center gap-4">
          <div className="text-gray-800 font-bold text-base leading-7">{mainBalance.title}</div>
          <div className="flex items-baseline gap-1 -translate-y-1 text-4xl leading-7 tracking-wide">
            {formatAmountDisplay(mainBalance.amount, true)}
          </div>
        </div>

        {/* 縦線 */}
        <div className="w-0 h-9 border-l border-gray-200"></div>

        {/* 詳細セクション */}
        <div className="flex flex-col justify-center gap-2">
          {balanceItems.map((item) => (
            <div key={getBalanceItemKey(item)} className="flex flex-row items-baseline gap-3">
              <div className="text-gray-600 font-bold text-sm leading-4">{item.label}</div>
              <div className="flex items-end gap-1 text-sm leading-4">
                {formatAmountDisplay(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* モバイル版レイアウト */}
      <div className="sm:hidden flex flex-row items-center gap-3">
        <div className="text-gray-800 font-bold text-sm leading-6">{mainBalance.title}</div>

        <div className="flex flex-col items-end gap-2 flex-1">
          {/* メイン値 */}
          <div className="flex flex-row justify-end gap-10">
            <div
              className="flex items-baseline gap-1 translate-y-0.5 font-bold"
              style={{ fontSize: "28px", lineHeight: "1.2" }}
            >
              {formatAmountDisplay(mainBalance.amount, true)}
            </div>
          </div>

          {/* 詳細項目 */}
          <div className="flex flex-col items-end gap-1">
            {balanceItems.map((item) => (
              <div key={getBalanceItemKey(item)} className="flex flex-row gap-3">
                <div className="text-gray-600 font-bold text-xs leading-4">{item.label}</div>
                <div className="flex items-end gap-1 text-xs leading-4">
                  {formatAmountDisplay(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
