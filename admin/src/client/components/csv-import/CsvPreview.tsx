"use client";
import "client-only";

import { useEffect, useRef, useState } from "react";
import type { PreviewMfCsvResult } from "@/server/contexts/data-import/application/usecases/preview-mf-csv-usecase";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import type { PreviewCsvRequest } from "@/server/contexts/data-import/presentation/actions/preview-csv";
import TransactionRow from "./TransactionRow";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import StatisticsTable from "./StatisticsTable";
import { ShadcnButton } from "@/client/components/ui";

interface CsvPreviewProps {
  file: File | null;
  politicalOrganizationId: string;
  onPreviewComplete?: (result: PreviewMfCsvResult) => void;
  previewAction: (data: PreviewCsvRequest) => Promise<PreviewMfCsvResult>;
}

export default function CsvPreview({
  file,
  politicalOrganizationId,
  onPreviewComplete,
  previewAction,
}: CsvPreviewProps) {
  const [previewResult, setPreviewResult] = useState<PreviewMfCsvResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"all" | "insert" | "update" | "invalid" | "skip">(
    "all",
  );
  const perPage = 10;
  const onPreviewCompleteRef = useRef(onPreviewComplete);

  // Always update the ref to the latest callback
  onPreviewCompleteRef.current = onPreviewComplete;

  useEffect(() => {
    if (!file || !politicalOrganizationId) {
      setPreviewResult(null);
      setError(null);
      setCurrentPage(1);
      setActiveTab("all");
      return;
    }

    const previewFile = async () => {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setActiveTab("all");

      try {
        const result = await previewAction({
          file,
          politicalOrganizationId,
        });

        setPreviewResult(result);
        onPreviewCompleteRef.current?.(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "CSVのプレビューに失敗しました";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    previewFile();
  }, [file, politicalOrganizationId, previewAction]);

  const handlePageChange = (page: number) => {
    if (!previewResult) return;
    const filteredTransactions = getFilteredTransactions();
    const totalPages = Math.ceil(filteredTransactions.length / perPage);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab: "all" | "insert" | "update" | "invalid" | "skip") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getFilteredTransactions = (): PreviewTransaction[] => {
    if (!previewResult) return [];

    const sortedTransactions = getSortedTransactions();

    if (activeTab === "all") {
      return sortedTransactions;
    }

    return sortedTransactions.filter((transaction) => transaction.status === activeTab);
  };

  const getSortedTransactions = (): PreviewTransaction[] => {
    if (!previewResult) return [];

    const statusOrder = { insert: 1, update: 2, invalid: 3, skip: 4 };
    return [...previewResult.transactions].sort((a, b) => {
      const aOrder = statusOrder[a.status] || 4;
      const bOrder = statusOrder[b.status] || 4;
      return aOrder - bOrder;
    });
  };

  const getCurrentPageRecords = (): PreviewTransaction[] => {
    const filteredTransactions = getFilteredTransactions();
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  const totalPages = previewResult ? Math.ceil(getFilteredTransactions().length / perPage) : 0;

  if (!file) return null;

  if (loading) {
    return (
      <div className="bg-primary-panel rounded-xl p-4 mt-4">
        <h3 className="text-lg font-medium text-white mb-2">CSVプレビュー</h3>
        <p className="text-primary-muted">ファイルを処理中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-primary-panel rounded-xl p-4 mt-4">
        <h3 className="text-lg font-medium text-white mb-2">CSVプレビュー</h3>
        <div className="text-red-500 mt-2">エラー: {error}</div>
      </div>
    );
  }

  if (!previewResult || previewResult.transactions.length === 0) return null;

  const currentRecords = getCurrentPageRecords();
  const filteredTransactions = getFilteredTransactions();

  const getTabCount = (tab: "all" | "insert" | "update" | "invalid" | "skip") => {
    if (tab === "all") return previewResult.summary.totalCount;
    return previewResult.transactions.filter((t) => t.status === tab).length;
  };

  const getTabLabel = (tab: "insert" | "update" | "invalid" | "skip") => {
    switch (tab) {
      case "insert":
        return "挿入";
      case "update":
        return "更新";
      case "invalid":
        return "無効";
      case "skip":
        return "スキップ";
    }
  };

  return (
    <div className="bg-primary-panel rounded-xl p-4 mt-4">
      <h3 className="text-lg font-medium text-white mb-4">CSVプレビュー</h3>

      <StatisticsTable statistics={previewResult.statistics} />

      {/* タブフィルター */}
      <div className="mb-4">
        <div className="flex gap-2">
          {[
            { key: "all" as const, label: "全件", color: "text-white" },
            { key: "insert" as const, label: "挿入", color: "text-green-500" },
            { key: "update" as const, label: "更新", color: "text-blue-500" },
            { key: "invalid" as const, label: "無効", color: "text-red-500" },
            {
              key: "skip" as const,
              label: "スキップ",
              color: "text-yellow-500",
            },
          ].map(({ key, label, color }) => (
            <ShadcnButton
              type="button"
              key={key}
              variant={activeTab === key ? "outline" : "ghost"}
              size="sm"
              onClick={() => handleTabChange(key)}
              className={activeTab === key ? `${color} border-white bg-white/10` : ""}
            >
              {label} ({getTabCount(key)})
            </ShadcnButton>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-primary-muted">
          {activeTab === "all" ? "全" : getTabLabel(activeTab)} {filteredTransactions.length} 件中{" "}
          {filteredTransactions.length > 0 ? (currentPage - 1) * perPage + 1 : 0} -{" "}
          {Math.min(currentPage * perPage, filteredTransactions.length)} 件を表示
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-primary-border">
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">状態</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">取引日</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">借方勘定科目</th>
              <th className="px-2 py-3 text-right text-sm font-semibold text-white">借方金額</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">貸方勘定科目</th>
              <th className="px-2 py-3 text-right text-sm font-semibold text-white">貸方金額</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">種別</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">カテゴリ</th>
              <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                摘要 <span className="text-xs font-normal">※サービスには表示されません</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((record, index) => (
              <TransactionRow
                key={`${(currentPage - 1) * perPage + index}-${record.transaction_date}-${record.debit_account}-${record.credit_account}-${record.debit_amount || 0}`}
                record={record}
                index={index}
                currentPage={currentPage}
                perPage={perPage}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ClientPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
