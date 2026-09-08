"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TransactionRow } from "./TransactionRow";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
import { DeleteAllButton } from "./DeleteAllButton";
import { ClearWebappCacheButton } from "./ClearWebappCacheButton";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import type { GetTransactionsResult } from "@/server/contexts/data-import/presentation/types";
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
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id ?? "");
  const isInitialLoad = useRef(true);

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 50;

  const fetchTransactions = useCallback(
    async (orgId: string) => {
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

        // 最終ページの最後の1件を削除した場合、前のページに補正
        if (result.transactions.length === 0 && result.total > 0 && currentPage > 1) {
          const correctedPage = Math.min(currentPage, result.totalPages) || 1;
          router.replace(`/transactions?page=${correctedPage}`);
          return;
        }

        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [currentPage, router],
  );

  useEffect(() => {
    fetchTransactions(selectedOrgId);
  }, [fetchTransactions, selectedOrgId]);

  const handleOrgFilterChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    // Reset to first page when filter changes
    if (currentPage > 1) {
      router.push("/transactions?page=1");
    }
  };

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">取引一覧</h1>

        {/* Organization Filter */}
        <div className="mb-4">
          <PoliticalOrganizationSelect
            organizations={organizations}
            value={selectedOrgId}
            onValueChange={handleOrgFilterChange}
          />
        </div>
      </div>

      {!loading && data && (
        <div className="flex justify-between items-center mt-5 mb-4">
          <p className="text-muted-foreground">
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
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground text-sm">取得中...</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500">エラー: {error}</p>
        </div>
      ) : !data ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">データがありません</p>
        </div>
      ) : data.transactions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">トランザクションが登録されていません</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    取引No
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    取引日
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    政治団体
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    借方勘定科目
                  </th>
                  <th className="px-2 py-3 text-right text-sm font-semibold text-foreground">
                    借方金額
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    貸方勘定科目
                  </th>
                  <th className="px-2 py-3 text-right text-sm font-semibold text-foreground">
                    貸方金額
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    種別
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    カテゴリ
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-foreground">
                    摘要 <span className="text-xs font-normal">※サービスには表示されません</span>
                  </th>
                  <th className="px-2 py-3 text-center text-sm font-semibold text-foreground w-16">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onDeleted={() => fetchTransactions(selectedOrgId)}
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
