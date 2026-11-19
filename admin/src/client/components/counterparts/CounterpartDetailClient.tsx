"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import type { RowSelectionState } from "@tanstack/react-table";
import type { OrganizationTarget } from "@/server/contexts/shared/domain/models/admin-target";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type {
  Counterpart,
  CounterpartWithUsage,
} from "@/server/contexts/report/domain/models/counterpart";
import { TransactionWithCounterpartTable } from "@/client/components/counterpart-assignment/TransactionWithCounterpartTable";
import { AssignCounterpartDialog } from "@/client/components/counterpart-assignment/AssignCounterpartDialog";
import { CounterpartFormDialog } from "@/client/components/counterparts/CounterpartFormDialog";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { BackLink } from "@/client/components/layout/BackLink";
import { CurrentTargetBar } from "@/client/components/layout/CurrentTargetBar";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
import { Button } from "@/client/components/ui";
import { formatDate } from "@/client/lib";
import { bulkUnassignCounterpartAction } from "@/server/contexts/report/presentation/actions/bulk-unassign-counterpart";

interface CounterpartDetailClientProps {
  counterpart: CounterpartWithUsage;
  transactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
  target: OrganizationTarget;
  allCounterparts: Counterpart[];
  initialFilters: {
    sortField: "transactionDate" | "debitAmount" | "categoryKey";
    sortOrder: "asc" | "desc";
  };
}

export function CounterpartDetailClient({
  counterpart,
  transactions,
  total,
  page,
  perPage,
  target,
  allCounterparts,
  initialFilters,
}: CounterpartDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sortField, setSortField] = useState(initialFilters.sortField);
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignDialogTransactions, setAssignDialogTransactions] = useState<
    TransactionWithCounterpart[]
  >([]);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const selectedTransactions = useMemo(() => {
    return transactions.filter((t) => rowSelection[t.id]);
  }, [transactions, rowSelection]);

  const handleAssignClick = (transaction: TransactionWithCounterpart) => {
    setAssignDialogTransactions([transaction]);
    setIsAssignDialogOpen(true);
  };

  const handleBulkAssignClick = () => {
    setAssignDialogTransactions(selectedTransactions);
    setIsAssignDialogOpen(true);
  };

  const handleAssignDialogClose = () => {
    setIsAssignDialogOpen(false);
    setAssignDialogTransactions([]);
  };

  const handleAssignSuccess = () => {
    setRowSelection({});
    setIsAssignDialogOpen(false);
    setAssignDialogTransactions([]);
    router.refresh();
  };

  const handleBulkUnassign = async () => {
    if (selectedTransactions.length === 0) return;

    const confirmed = window.confirm(
      `選択した${selectedTransactions.length}件の取引から取引先の紐付けを解除しますか？`,
    );
    if (!confirmed) return;

    setIsUnassigning(true);
    try {
      const result = await bulkUnassignCounterpartAction({
        transactionIds: selectedTransactions.map((t) => t.id),
      });

      if (!result.success) {
        throw new Error(result.errors?.join(", ") ?? "紐付け解除に失敗しました");
      }

      setRowSelection({});
      router.refresh();
    } catch (error) {
      console.error("Failed to unassign counterparts:", error);
      alert(error instanceof Error ? error.message : "紐付け解除に失敗しました");
    } finally {
      setIsUnassigning(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  const buildUrl = (params: { sort?: string; order?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("sort", params.sort ?? sortField);
    searchParams.set("order", params.order ?? sortOrder);
    searchParams.set("page", String(params.page ?? 1));
    return `/counterparts/${counterpart.id}?${searchParams.toString()}`;
  };

  const handleSortChange = (field: "transactionDate" | "debitAmount" | "categoryKey") => {
    let newOrder: "asc" | "desc" = "desc";
    if (sortField === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortOrder(newOrder);
    startTransition(() => {
      router.push(buildUrl({ sort: field, order: newOrder }));
    });
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    router.refresh();
  };

  return (
    <div>
      <BackLink href="/counterparts">一覧に戻る</BackLink>

      <PageHeader
        label="Counterparts"
        title="取引先詳細"
        actions={
          <Button
            type="button"
            variant="outline"
            className="text-[13px]"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <PencilSimple />
            編集
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[17px] font-bold tracking-[0.04em] text-foreground">
            取引先情報
          </h2>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div>
              <dt className="mb-1 text-xs font-bold text-muted-foreground">名前</dt>
              <dd className="text-sm font-semibold text-foreground">{counterpart.name}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-bold text-muted-foreground">住所</dt>
              <dd className="text-sm text-foreground">{counterpart.address || "-"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-bold text-muted-foreground">作成日</dt>
              <dd className="font-latin text-sm text-foreground">
                {formatDate(counterpart.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-bold text-muted-foreground">更新日</dt>
              <dd className="font-latin text-sm text-foreground">
                {formatDate(counterpart.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-bold text-muted-foreground">使用回数</dt>
              <dd className="font-latin text-sm font-semibold text-foreground">
                {counterpart.usageCount}件
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[17px] font-bold tracking-[0.04em] text-foreground">
            紐づいている取引
          </h2>

          <CurrentTargetBar target={target} note="の取引を表示しています" />

          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">{total}件の取引</p>
            {isPending && <p className="text-[13px] text-muted-foreground">読み込み中...</p>}
          </div>

          {selectedTransactions.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border-soft bg-secondary p-3">
              <span className="text-[13px] text-foreground">
                選択中:{" "}
                <span className="font-latin font-semibold">{selectedTransactions.length}</span>件
              </span>
              <Button type="button" size="sm" onClick={handleBulkAssignClick}>
                一括紐付け変更
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleBulkUnassign}
                disabled={isUnassigning}
              >
                {isUnassigning ? "処理中..." : "一括紐付け解除"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setRowSelection({})}>
                選択解除
              </Button>
            </div>
          )}

          <TransactionWithCounterpartTable
            transactions={transactions}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onAssignClick={handleAssignClick}
          />

          {totalPages > 1 && (
            <StaticPagination
              currentPage={page}
              totalPages={totalPages}
              buildPageUrl={(nextPage) => buildUrl({ page: nextPage })}
            />
          )}
        </section>

        {isEditDialogOpen && (
          <CounterpartFormDialog
            mode="edit"
            counterpart={counterpart}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={handleEditSuccess}
          />
        )}

        <AssignCounterpartDialog
          isOpen={isAssignDialogOpen}
          transactions={assignDialogTransactions}
          allCounterparts={allCounterparts}
          politicalOrganizationId={target.organizationId}
          onClose={handleAssignDialogClose}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </div>
  );
}
