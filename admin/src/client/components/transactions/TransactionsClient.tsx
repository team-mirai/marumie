"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TransactionRow } from "@/client/components/transactions/TransactionRow";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
import { DeleteAllButton } from "@/client/components/transactions/DeleteAllButton";
import { ClearWebappCacheButton } from "@/client/components/transactions/ClearWebappCacheButton";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/client/components/ui";
import type { GetTransactionsResult } from "@/server/contexts/data-import/presentation/types";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

interface TransactionsClientProps {
  organizations: PoliticalOrganization[];
}

function formatRangeText(data: GetTransactionsResult): string {
  const start = data.total === 0 ? 0 : (data.page - 1) * data.perPage + 1;
  const end = Math.min(data.page * data.perPage, data.total);
  return `全 ${data.total.toLocaleString()} 件中 ${start.toLocaleString()} - ${end.toLocaleString()} 件を表示`;
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

  const headerNote = (
    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
      ※サービスには表示されません
    </span>
  );

  return (
    <div>
      <PageHeader label="Transactions" title="取引一覧" />

      <div className="rounded-lg border border-border bg-card p-6">
        {/* Toolbar */}
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrgId}
              onValueChange={handleOrgFilterChange}
              hideLabel
            />
            {!loading && data && (
              <p className="text-[13px] text-muted-foreground">{formatRangeText(data)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <ClearWebappCacheButton />
            <DeleteAllButton
              disabled={loading || !data || data.total === 0}
              organizationId={selectedOrgId || undefined}
              onDeleted={() => {
                // データを再取得
                window.location.reload();
              }}
            />
          </div>
        </div>

        {fetching && (
          <div className="mb-4 flex items-center justify-center gap-2 py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">取得中...</p>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-destructive">エラー: {error}</p>
          </div>
        ) : !data ? (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">データがありません</p>
          </div>
        ) : data.transactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted-foreground">トランザクションが登録されていません</p>
          </div>
        ) : (
          <>
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>取引No</TableHead>
                  <TableHead>取引日</TableHead>
                  <TableHead>政治団体</TableHead>
                  <TableHead>借方勘定科目</TableHead>
                  <TableHead className="text-right">借方金額</TableHead>
                  <TableHead>貸方勘定科目</TableHead>
                  <TableHead className="text-right">貸方金額</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>
                    摘要
                    {headerNote}
                  </TableHead>
                  <TableHead className="w-16 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onDeleted={() => fetchTransactions(selectedOrgId)}
                  />
                ))}
              </TableBody>
            </Table>

            <StaticPagination
              currentPage={data.page}
              totalPages={data.totalPages}
              basePath="/transactions"
            />
          </>
        )}
      </div>
    </div>
  );
}
