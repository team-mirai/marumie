"use client";
import "client-only";

import { useState } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import type { PreviewDonorCsvResult } from "@/server/contexts/report/presentation/types/preview-donor-csv-types";
import type {
  PreviewDonorCsvRow,
  PreviewDonorCsvRowStatus,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";
import DonorCsvRow from "@/client/components/donor-csv-import/DonorCsvRow";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui";
import { cn, resolveDonorCsvStatusBadge } from "@/client/lib";

interface DonorCsvPreviewProps {
  result: PreviewDonorCsvResult;
  onImport?: () => Promise<void>;
  isImporting?: boolean;
}

type TabKey = "all" | "valid_new" | "valid_existing" | PreviewDonorCsvRowStatus;

interface TabDefinition {
  key: TabKey;
  label: string;
  tooltip?: string;
}

const TABS: TabDefinition[] = [
  { key: "all", label: "全件" },
  {
    key: "valid_new",
    label: "新規寄付者",
    tooltip: "寄付者マスタに未登録の寄付者です。インポート時に新規登録されます",
  },
  {
    key: "valid_existing",
    label: "既存寄付者",
    tooltip: "寄付者マスタに登録済みの寄付者です。既存データに紐付けられます",
  },
  {
    key: "invalid",
    label: resolveDonorCsvStatusBadge("invalid").label,
    tooltip: "CSVの入力値に問題があります（必須項目の欠落、フォーマット不正など）",
  },
  {
    key: "transaction_not_found",
    label: resolveDonorCsvStatusBadge("transaction_not_found").label,
    tooltip: "指定された取引Noに対応する取引データが見つかりません",
  },
  {
    key: "type_mismatch",
    label: resolveDonorCsvStatusBadge("type_mismatch").label,
    tooltip: "CSVの寄付者種別と取引のカテゴリ種別が一致しません",
  },
];

const PER_PAGE = 10;

/**
 * 寄付者 CSV のプレビュー（白カード・テーブル罫線ルールは取引一覧と同一）。
 * プレビューの取得は親（DonorCsvImportClient）が行い、本コンポーネントは表示と実行ボタンを担う。
 */
export default function DonorCsvPreview({
  result,
  onImport,
  isImporting = false,
}: DonorCsvPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(1);

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
    switch (tab) {
      case "all":
        return result.summary.total;
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
    const totalPages = Math.ceil(getFilteredRows().length / PER_PAGE);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredRows = getFilteredRows();
  const totalPages = Math.ceil(filteredRows.length / PER_PAGE);
  const startIndex = (currentPage - 1) * PER_PAGE;
  const endIndex = startIndex + PER_PAGE;
  const currentRows = filteredRows.slice(startIndex, endIndex);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-bold text-foreground">取り込みプレビュー</h2>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, tooltip }) => {
            const isActive = activeTab === key;
            const button = (
              <Button
                type="button"
                aria-pressed={isActive}
                variant="outline"
                size="sm"
                onClick={() => handleTabChange(key)}
                className={cn(
                  "text-xs",
                  isActive && "border-primary-active bg-accent text-primary-active hover:bg-accent",
                )}
              >
                {label}
                <span className="font-latin">({getTabCount(key)})</span>
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
        <p className="text-[13px] text-muted-foreground">
          {filteredRows.length} 件中 {filteredRows.length > 0 ? startIndex + 1 : 0} -{" "}
          {Math.min(endIndex, filteredRows.length)} 件を表示
        </p>
      </div>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>行番号</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>取引No</TableHead>
              <TableHead>寄付者名</TableHead>
              <TableHead>寄付者種別</TableHead>
              <TableHead>住所</TableHead>
              <TableHead>職業</TableHead>
              <TableHead>取引日</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>備考</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  表示するデータがありません
                </TableCell>
              </TableRow>
            ) : (
              currentRows.map((row) => <DonorCsvRow key={row.rowNumber} row={row} />)
            )}
          </TableBody>
        </Table>
      </div>

      <ClientPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {onImport && (
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onImport} disabled={validCount === 0 || isImporting}>
            {isImporting ? (
              <>
                <CircleNotch aria-hidden className="animate-spin" />
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
