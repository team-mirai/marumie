"use client";
import "client-only";

import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";

interface TransactionRowProps {
  record: PreviewTransaction;
  index: number;
  currentPage: number;
  perPage: number;
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
      return "bg-gray-500";
    case "invalid":
      return "bg-orange-600";
    default:
      return "bg-gray-600";
  }
}

function getStatusBgClass(status: PreviewTransaction["status"]) {
  switch (status) {
    case "insert":
      return "bg-green-600";
    case "update":
      return "bg-gray-500";
    case "invalid":
      return "bg-red-600";
    case "skip":
      return "bg-yellow-600";
    default:
      return "bg-gray-600";
  }
}

function getStatusText(status: PreviewTransaction["status"]) {
  switch (status) {
    case "insert":
      return "挿入";
    case "update":
      return "更新";
    case "invalid":
      return "無効";
    case "skip":
      return "スキップ";
    default:
      return "不明";
  }
}

export default function TransactionRow({
  record,
  index,
  currentPage,
  perPage,
}: TransactionRowProps) {
  return (
    <tr
      key={`${(currentPage - 1) * perPage + index}-${record.transaction_date}-${record.debit_account}-${record.credit_account}-${record.debit_amount || 0}`}
      className="border-b border-border"
    >
      <td className="px-2 py-3 text-sm">
        <span
          className={`px-2 py-1 rounded text-white text-xs font-semibold ${getStatusBgClass(record.status)}`}
        >
          {getStatusText(record.status)}
        </span>
        {record.errors.length > 0 && (
          <div
            className={`text-xs mt-1 ${
              record.status === "skip" ? "text-yellow-500" : "text-red-500"
            }`}
          >
            {record.errors.map((error, errorIndex) => (
              <div key={`error-${errorIndex}-${error}`}>{error}</div>
            ))}
          </div>
        )}
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        {new Date(record.transaction_date).toLocaleDateString("ja-JP")}
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        {record.debit_account}
        {record.debit_sub_account && (
          <div className="text-muted-foreground text-xs">{record.debit_sub_account}</div>
        )}
      </td>
      <td className="px-2 py-3 text-sm text-right text-foreground">
        {record.debit_amount ? `¥${record.debit_amount.toLocaleString()}` : "-"}
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        {record.credit_account}
        {record.credit_sub_account && (
          <div className="text-muted-foreground text-xs">{record.credit_sub_account}</div>
        )}
      </td>
      <td className="px-2 py-3 text-sm text-right text-foreground">
        {record.credit_amount ? `¥${record.credit_amount.toLocaleString()}` : "-"}
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        <span
          className={`px-2 py-1 rounded text-white text-xs font-medium ${getTypeBadgeClass(record.transaction_type || "unknown")}`}
        >
          {getTypeLabel(record.transaction_type || "unknown")}
        </span>
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        <CategoryPill transaction={record} />
      </td>
      <td className="px-2 py-3 text-sm text-foreground">
        {record.description || "-"}
        {record.label && (
          <div className="text-muted-foreground text-xs mt-1">ラベル: {record.label}</div>
        )}
      </td>
    </tr>
  );
}
