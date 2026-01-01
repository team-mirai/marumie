"use client";
import "client-only";

import { useState } from "react";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type {
  PreviewDonorCsvRow,
  PreviewDonorCsvRowStatus,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import DonorCsvRow from "./DonorCsvRow";
import DonorCsvSummary from "./DonorCsvSummary";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Button } from "@/client/components/ui";

interface DonorCsvPreviewProps {
  result: PreviewDonorCsvResult;
}

type TabKey = "all" | PreviewDonorCsvRowStatus;

const TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "all", label: "全件", color: "text-white" },
  { key: "valid", label: "正常", color: "text-green-500" },
  { key: "invalid", label: "エラー", color: "text-red-500" },
  { key: "transaction_not_found", label: "取引なし", color: "text-yellow-500" },
  { key: "type_mismatch", label: "種別不整合", color: "text-orange-500" },
];

export default function DonorCsvPreview({ result }: DonorCsvPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const getFilteredRows = (): PreviewDonorCsvRow[] => {
    if (activeTab === "all") {
      return result.rows;
    }
    return result.rows.filter((row) => row.status === activeTab);
  };

  const getTabCount = (tab: TabKey): number => {
    if (tab === "all") return result.summary.total;
    switch (tab) {
      case "valid":
        return result.summary.valid;
      case "invalid":
        return result.summary.invalid;
      case "transaction_not_found":
        return result.summary.transactionNotFound;
      case "type_mismatch":
        return result.summary.typeMismatch;
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const filteredRows = getFilteredRows();
    const totalPages = Math.ceil(filteredRows.length / perPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredRows = getFilteredRows();
  const totalPages = Math.ceil(filteredRows.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentRows = filteredRows.slice(startIndex, endIndex);

  return (
    <div>
      <DonorCsvSummary summary={result.summary} />

      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(({ key, label, color }) => (
            <Button
              type="button"
              key={key}
              variant={activeTab === key ? "outline" : "ghost"}
              size="sm"
              onClick={() => handleTabChange(key)}
              className={activeTab === key ? `${color} border-white bg-white/10` : ""}
            >
              {label} ({getTabCount(key)})
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-muted-foreground text-sm">
          {filteredRows.length} 件中 {filteredRows.length > 0 ? startIndex + 1 : 0} -{" "}
          {Math.min(endIndex, filteredRows.length)} 件を表示
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">行番号</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">ステータス</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">取引No</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">寄付者名</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">寄付者種別</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">住所</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">職業</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">取引日</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">カテゴリ</th>
              <th className="px-2 py-3 text-right text-sm font-semibold text-white">金額</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">備考</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-2 py-8 text-center text-muted-foreground">
                  表示するデータがありません
                </td>
              </tr>
            ) : (
              currentRows.map((row) => <DonorCsvRow key={row.rowNumber} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <ClientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
