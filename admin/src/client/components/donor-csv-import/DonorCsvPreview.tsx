"use client";
import "client-only";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type {
  PreviewDonorCsvRow,
  PreviewDonorCsvRowStatus,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import DonorCsvRow from "./DonorCsvRow";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Button, Tooltip, TooltipTrigger, TooltipContent } from "@/client/components/ui";

interface DonorCsvPreviewProps {
  result: PreviewDonorCsvResult;
  onImport?: () => Promise<void>;
  isImporting?: boolean;
}

type TabKey = "all" | "valid_new" | "valid_existing" | PreviewDonorCsvRowStatus;

interface TabDefinition {
  key: TabKey;
  label: string;
  color: string;
  tooltip?: string;
}

const TABS: TabDefinition[] = [
  { key: "all", label: "全件", color: "text-white" },
  {
    key: "valid_new",
    label: "新規寄付者",
    color: "text-green-500",
    tooltip: "寄付者マスタに未登録の寄付者です。インポート時に新規登録されます",
  },
  {
    key: "valid_existing",
    label: "既存寄付者",
    color: "text-emerald-400",
    tooltip: "寄付者マスタに登録済みの寄付者です。既存データに紐付けられます",
  },
  {
    key: "invalid",
    label: "エラー",
    color: "text-red-500",
    tooltip: "CSVの入力値に問題があります（必須項目の欠落、フォーマット不正など）",
  },
  {
    key: "transaction_not_found",
    label: "取引なし",
    color: "text-yellow-500",
    tooltip: "指定された取引Noに対応する取引データが見つかりません",
  },
  {
    key: "type_mismatch",
    label: "種別不整合",
    color: "text-orange-500",
    tooltip: "CSVの寄付者種別と取引のカテゴリ種別が一致しません",
  },
];

export default function DonorCsvPreview({
  result,
  onImport,
  isImporting = false,
}: DonorCsvPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const validCount = result.summary.valid;

  const getFilteredRows = (): PreviewDonorCsvRow[] => {
    if (activeTab === "all") {
      return result.rows;
    }
    if (activeTab === "valid_new") {
      return result.rows.filter((row) => row.status === "valid" && !row.matchingDonor);
    }
    if (activeTab === "valid_existing") {
      return result.rows.filter((row) => row.status === "valid" && row.matchingDonor);
    }
    return result.rows.filter((row) => row.status === activeTab);
  };

  const getTabCount = (tab: TabKey): number => {
    if (tab === "all") return result.summary.total;
    switch (tab) {
      case "valid_new":
        return result.summary.validNew;
      case "valid_existing":
        return result.summary.validExisting;
      case "invalid":
        return result.summary.invalid;
      case "transaction_not_found":
        return result.summary.transactionNotFound;
      case "type_mismatch":
        return result.summary.typeMismatch;
      default:
        return 0;
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
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(({ key, label, color, tooltip }) => {
            const isActive = activeTab === key;
            const button = (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTabChange(key)}
                className={isActive ? color : "text-white/60"}
              >
                {label} ({getTabCount(key)})
              </Button>
            );

            if (tooltip) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              );
            }

            return <span key={key}>{button}</span>;
          })}
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

      {onImport && (
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onImport} disabled={validCount === 0 || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                インポート中...
              </>
            ) : (
              `${validCount}件をインポート`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
