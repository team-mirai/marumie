"use client";
import "client-only";

import type { PreviewMfCsvResult } from "@/server/contexts/data-import/presentation/types";

interface StatisticsTableProps {
  statistics: PreviewMfCsvResult["statistics"];
}

export default function StatisticsTable({ statistics }: StatisticsTableProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(amount);
  };

  const formatCell = (count: number, amount: number) => {
    if (count === 0) return "–";
    return `${formatAmount(amount)} (${count}件)`;
  };

  return (
    <div className="mb-4">
      <h4 className="text-md font-medium text-white mb-3">取引種別別統計</h4>
      <div>
        <table className="border-collapse border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-input">
              <th className="border border-border px-4 py-2 text-left text-xs font-semibold text-white">
                状態
              </th>
              <th className="border border-border px-4 py-2 text-center text-xs font-semibold text-white">
                収入
              </th>
              <th className="border border-border px-4 py-2 text-center text-xs font-semibold text-white">
                支出
              </th>
              <th className="border border-border px-4 py-2 text-center text-xs font-semibold text-white">
                収入（相殺）
              </th>
              <th className="border border-border px-4 py-2 text-center text-xs font-semibold text-white">
                支出（相殺）
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border px-4 py-2 text-xs text-green-500 font-medium">
                挿入
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.insert.income.count, statistics.insert.income.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.insert.expense.count, statistics.insert.expense.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.insert.offset_income.count,
                  statistics.insert.offset_income.amount,
                )}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.insert.offset_expense.count,
                  statistics.insert.offset_expense.amount,
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-4 py-2 text-xs text-blue-500 font-medium">
                更新
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.update.income.count, statistics.update.income.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.update.expense.count, statistics.update.expense.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.update.offset_income.count,
                  statistics.update.offset_income.amount,
                )}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.update.offset_expense.count,
                  statistics.update.offset_expense.amount,
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-4 py-2 text-xs text-red-500 font-medium">
                無効
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.invalid.income.count, statistics.invalid.income.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.invalid.expense.count, statistics.invalid.expense.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.invalid.offset_income.count,
                  statistics.invalid.offset_income.amount,
                )}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.invalid.offset_expense.count,
                  statistics.invalid.offset_expense.amount,
                )}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-4 py-2 text-xs text-yellow-500 font-medium">
                スキップ
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.skip.income.count, statistics.skip.income.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(statistics.skip.expense.count, statistics.skip.expense.amount)}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.skip.offset_income.count,
                  statistics.skip.offset_income.amount,
                )}
              </td>
              <td className="border border-border px-4 py-2 text-xs text-white text-center">
                {formatCell(
                  statistics.skip.offset_expense.count,
                  statistics.skip.offset_expense.amount,
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
