"use client";
import "client-only";

import type { TransactionWithOrganization } from "@/server/contexts/shared/domain/transaction";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";
import type { TransactionType } from "@/shared/models/transaction";

interface TransactionRowProps {
  transaction: TransactionWithOrganization;
}

const DEFAULT_CATEGORY_COLOR = "#64748B"; // slate-500 as default fallback color

function getCategoryInfoByAccount(accountName: string) {
  return PL_CATEGORIES[accountName];
}

function getCategoryColor(accountName: string): string {
  const categoryInfo = getCategoryInfoByAccount(accountName);
  return categoryInfo?.color || DEFAULT_CATEGORY_COLOR;
}

function getCategoryLabel(accountName: string): string {
  const categoryInfo = getCategoryInfoByAccount(accountName);
  return categoryInfo?.shortLabel || accountName;
}

function getTransactionCategory(transaction: TransactionWithOrganization): {
  account: string;
  color: string;
  label: string;
  type: TransactionType;
} {
  // non_cash_journal取引の場合はカテゴリを表示しない
  if (transaction.transaction_type === "non_cash_journal") {
    return {
      account: "non_cash_journal",
      color: "#6B7280", // グレー
      label: "-",
      type: "non_cash_journal" as const,
    };
  }

  // offset系の取引の場合
  if (transaction.transaction_type === "offset_income") {
    return {
      account: transaction.credit_account,
      color: getCategoryColor(transaction.credit_account),
      label: getCategoryLabel(transaction.credit_account),
      type: "offset_income" as const,
    };
  }

  if (transaction.transaction_type === "offset_expense") {
    return {
      account: transaction.debit_account,
      color: getCategoryColor(transaction.debit_account),
      label: getCategoryLabel(transaction.debit_account),
      type: "offset_expense" as const,
    };
  }

  // 借方（debit）が費用系の場合は借方のカテゴリを、そうでなければ貸方のカテゴリを表示
  const debitInfo = getCategoryInfoByAccount(transaction.debit_account);
  const creditInfo = getCategoryInfoByAccount(transaction.credit_account);

  if (debitInfo?.type === "expense") {
    return {
      account: transaction.debit_account,
      color: getCategoryColor(transaction.debit_account),
      label: getCategoryLabel(transaction.debit_account),
      type: debitInfo.type,
    };
  } else {
    return {
      account: transaction.credit_account,
      color: getCategoryColor(transaction.credit_account),
      label: getCategoryLabel(transaction.credit_account),
      type: creditInfo?.type || transaction.transaction_type,
    };
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "income":
      return "現金収入";
    case "expense":
      return "現金支出";
    case "non_cash_journal":
      return "非現金仕訳";
    case "offset_income":
      return "相殺収入";
    case "offset_expense":
      return "相殺支出";
    case "invalid":
      return "無効";
    default:
      return "不明";
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "income":
    case "offset_income":
      return "bg-green-600";
    case "expense":
    case "offset_expense":
      return "bg-red-600";
    case "non_cash_journal":
      return "bg-blue-600";
    case "invalid":
      return "bg-orange-600";
    default:
      return "bg-gray-600";
  }
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ja-JP");
  };

  return (
    <tr className="border-b border-border">
      <td className="px-2 py-3 text-sm text-white">{formatDate(transaction.transaction_date)}</td>
      <td className="px-2 py-3 text-sm text-white">
        {transaction.political_organization_name || "-"}
      </td>
      <td className="px-2 py-3 text-sm text-white">
        {transaction.debit_account}
        {transaction.debit_sub_account && (
          <div className="text-muted-foreground text-xs">{transaction.debit_sub_account}</div>
        )}
      </td>
      <td className="px-2 py-3 text-sm text-right text-white">
        ¥{transaction.debit_amount.toLocaleString()}
      </td>
      <td className="px-2 py-3 text-sm text-white">
        {transaction.credit_account}
        {transaction.credit_sub_account && (
          <div className="text-muted-foreground text-xs">{transaction.credit_sub_account}</div>
        )}
      </td>
      <td className="px-2 py-3 text-sm text-right text-white">
        ¥{transaction.credit_amount.toLocaleString()}
      </td>
      <td className="px-2 py-3 text-sm text-white">
        <div
          className={`inline-block px-2 py-1 rounded text-white text-xs font-medium ${getTypeBadgeClass(transaction.transaction_type)}`}
        >
          {getTypeLabel(transaction.transaction_type)}
        </div>
      </td>
      <td className="px-2 py-3 text-sm text-white">
        {(() => {
          const category = getTransactionCategory(transaction);
          return (
            <div
              className={`inline-block px-2 py-1 rounded text-xs font-medium max-w-fit ${
                category.type === "income" || category.type === "offset_income"
                  ? "text-black"
                  : "text-white"
              }`}
              style={{ backgroundColor: category.color }}
            >
              {category.label}
            </div>
          );
        })()}
      </td>
      <td className="px-2 py-3 text-sm text-white">
        {transaction.description || "-"}
        {transaction.label && (
          <div className="text-blue-400 text-xs mt-1">ラベル: {transaction.label}</div>
        )}
      </td>
    </tr>
  );
}
