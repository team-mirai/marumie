"use client";
import "client-only";

import { useState, type ReactNode } from "react";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/presentation/types";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { Button, Table, TableBody, TableHead, TableHeader, TableRow } from "@/client/components/ui";
import { cn, resolvePreviewStatusBadge } from "@/client/lib";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import TransactionRow from "@/client/components/csv-import/TransactionRow";
import StatisticsTable from "@/client/components/csv-import/StatisticsTable";

type PreviewStatus = PreviewTransaction["status"];
type PreviewTab = "all" | PreviewStatus;

const TABS: PreviewTab[] = ["all", "insert", "update", "invalid", "skip"];
const STATUS_ORDER: Record<PreviewStatus, number> = { insert: 1, update: 2, invalid: 3, skip: 4 };
const PER_PAGE = 10;

interface CsvPreviewProps {
  result: PreviewMfCsvResult;
  /** カード右下に置くアクション（保存ボタンなど） */
  footer?: ReactNode;
}

function tabLabel(tab: PreviewTab): string {
  return tab === "all" ? "全件" : resolvePreviewStatusBadge(tab).label;
}

/**
 * CSV 取り込みプレビュー（白カード・テーブル罫線ルールは取引一覧と同一）。
 * プレビューの取得は親（CsvUploadClient）が行い、本コンポーネントは表示のみを担う。
 */
export default function CsvPreview({ result, footer }: CsvPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<PreviewTab>("all");

  const sortedTransactions = [...result.transactions].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
  const filteredTransactions =
    activeTab === "all"
      ? sortedTransactions
      : sortedTransactions.filter((transaction) => transaction.status === activeTab);
  const totalPages = Math.ceil(filteredTransactions.length / PER_PAGE);
  const startIndex = (currentPage - 1) * PER_PAGE;
  const currentRecords = filteredTransactions.slice(startIndex, startIndex + PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab: PreviewTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const tabCount = (tab: PreviewTab) =>
    tab === "all"
      ? result.summary.totalCount
      : result.transactions.filter((t) => t.status === tab).length;

  if (result.transactions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-bold text-foreground">取り込みプレビュー</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          取り込み対象の取引が見つかりませんでした。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-bold text-foreground">取り込みプレビュー</h2>

      <div className="mt-4">
        <StatisticsTable statistics={result.statistics} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="取り込み状態で絞り込み">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Button
                type="button"
                key={tab}
                role="tab"
                aria-selected={isActive}
                variant="outline"
                size="sm"
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "text-xs",
                  isActive && "border-primary-active bg-accent text-primary-active hover:bg-accent",
                )}
              >
                {tabLabel(tab)}
                <span className="font-latin">({tabCount(tab)})</span>
              </Button>
            );
          })}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {activeTab === "all" ? "全" : tabLabel(activeTab)} {filteredTransactions.length} 件中{" "}
          {filteredTransactions.length > 0 ? startIndex + 1 : 0} -{" "}
          {Math.min(startIndex + PER_PAGE, filteredTransactions.length)} 件を表示
        </p>
      </div>

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>状態</TableHead>
              <TableHead>取引日</TableHead>
              <TableHead>借方勘定科目</TableHead>
              <TableHead className="text-right">借方金額</TableHead>
              <TableHead>貸方勘定科目</TableHead>
              <TableHead className="text-right">貸方金額</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>
                摘要{" "}
                <span className="font-normal text-muted-foreground">
                  ※サービスには表示されません
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.map((record, index) => (
              <TransactionRow key={`${record.hash}-${startIndex + index}`} record={record} />
            ))}
          </TableBody>
        </Table>
      </div>

      <ClientPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {footer && <div className="mt-6 flex justify-end">{footer}</div>}
    </div>
  );
}
