"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TransactionRow } from "./TransactionRow";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
import { DeleteAllButton } from "./DeleteAllButton";
import { ClearWebappCacheButton } from "./ClearWebappCacheButton";
import { Selector } from "@/client/components/ui";
import type { GetTransactionsResult } from "@/server/usecases/get-transactions-usecase";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

interface TransactionsClientProps {
  organizations: PoliticalOrganization[];
}

export function TransactionsClient({ organizations }: TransactionsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<GetTransactionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const isInitialLoad = useRef(true);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 50;

  const organizationOptions = [
    { value: "", label: "全件" },
    ...organizations.map((org) => ({
      value: org.id,
      label: org.displayName,
    })),
  ];

  useEffect(() => {
    const fetchTransactions = async (orgId: string = "") => {
      try {
        // 初回ロードはloading、以降はfetching
        if (isInitialLoad.current) {
          setLoading(true);
          isInitialLoad.current = false;
        } else {
          setFetching(true);
        }

        const params = new URLSearchParams({
          page: currentPage.toString(),
          perPage: perPage.toString(),
        });

        if (orgId) {
          params.set("orgIds", orgId);
        }

        const response = await fetch(`/api/transactions?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const result: GetTransactionsResult = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    fetchTransactions(selectedOrgId);
  }, [currentPage, selectedOrgId]);

  const handleOrgFilterChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Reset to first page when filter changes
    if (currentPage > 1) {
      router.push("/transactions?page=1");
    }
  };

  return (
    <div className="bg-primary-panel rounded-xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-4">取引一覧</h1>

        {/* Organization Filter */}
        <div className="mb-4">
          <div className="flex-1">
            <Selector
              options={organizationOptions}
              value={selectedOrgId}
              onChange={handleOrgFilterChange}
              label="政治団体でフィルタ"
              placeholder=""
            />
          </div>
        </div>
      </div>

      {!loading && data && (
        <div className="flex justify-between items-center mt-5 mb-4">
          <p className="text-primary-muted">
            全 {data.total} 件中 {(data.page - 1) * data.perPage + 1} -{" "}
            {Math.min(data.page * data.perPage, data.total)} 件を表示
          </p>
          <div className="flex gap-2">
            <ClearWebappCacheButton />
            <DeleteAllButton
              disabled={data.total === 0}
              organizationId={selectedOrgId || undefined}
              onDeleted={() => {
                // データを再取得
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {fetching && (
        <div className="text-center py-2 mb-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-muted border-t-transparent rounded-full animate-spin"></div>
            <p className="text-primary-muted text-sm">取得中...</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <p className="text-primary-muted">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500">エラー: {error}</p>
        </div>
      ) : !data ? (
        <div className="text-center py-10">
          <p className="text-primary-muted">データがありません</p>
        </div>
      ) : data.transactions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-primary-muted">
            トランザクションが登録されていません
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-primary-border">
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    取引日
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    政治団体
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    借方勘定科目
                  </th>
                  <th className="px-2 py-3 text-right text-sm font-semibold text-white">
                    借方金額
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    貸方勘定科目
                  </th>
                  <th className="px-2 py-3 text-right text-sm font-semibold text-white">
                    貸方金額
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    種別
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    カテゴリ
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-white">
                    摘要{" "}
                    <span className="text-xs font-normal">
                      ※サービスには表示されません
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <StaticPagination
            currentPage={data.page}
            totalPages={data.totalPages}
            basePath="/transactions"
          />
        </>
      )}
    </div>
  );
}
