"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RowSelectionState } from "@tanstack/react-table";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type {
  Counterpart,
  CounterpartWithUsage,
} from "@/server/contexts/report/domain/models/counterpart";
import { TransactionWithCounterpartTable } from "@/client/components/counterpart-assignment/TransactionWithCounterpartTable";
import { AssignCounterpartDialog } from "@/client/components/counterpart-assignment/AssignCounterpartDialog";
import { CounterpartFormDialog } from "@/client/components/counterparts/CounterpartFormDialog";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Card, Input, Button, Label } from "@/client/components/ui";
import { formatDate } from "@/client/lib";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { bulkUnassignCounterpartAction } from "@/server/contexts/report/presentation/actions/bulk-unassign-counterpart";

interface CounterpartDetailClientProps {
  counterpart: CounterpartWithUsage;
  transactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
  organizations: PoliticalOrganization[];
  allCounterparts: Counterpart[];
  initialFilters: {
    politicalOrganizationId: string;
    financialYear: number;
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
  organizations,
  allCounterparts,
  initialFilters,
}: CounterpartDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialFinancialYear = useMemo(() => new Date().getFullYear(), []);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    initialFilters.politicalOrganizationId || "",
  );
  const [financialYear, setFinancialYear] = useState(
    initialFilters.financialYear || initialFinancialYear,
  );
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

  const buildUrl = (params: {
    orgId?: string;
    year?: number;
    sort?: string;
    order?: string;
    page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.orgId ?? selectedOrganizationId) {
      searchParams.set("orgId", params.orgId ?? selectedOrganizationId);
    }
    searchParams.set("year", String(params.year ?? financialYear));
    searchParams.set("sort", params.sort ?? sortField);
    searchParams.set("order", params.order ?? sortOrder);
    searchParams.set("page", String(params.page ?? 1));
    return `/counterparts/${counterpart.id}?${searchParams.toString()}`;
  };

  const handleOrganizationChange = (value: string) => {
    setSelectedOrganizationId(value);
    startTransition(() => {
      router.push(buildUrl({ orgId: value, page: 1 }));
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(year)) {
      setFinancialYear(year);
      startTransition(() => {
        router.push(buildUrl({ year, page: 1 }));
      });
    }
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

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(buildUrl({ page: newPage }));
    });
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="bg-card rounded-xl p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/counterparts"
          className="text-muted-foreground hover:text-white transition-colors"
        >
          ← 一覧に戻る
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-white">カウンターパート情報</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            編集
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-muted-foreground text-sm mb-1">名前</div>
            <div className="text-white font-medium">{counterpart.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm mb-1">住所</div>
            <div className="text-white">{counterpart.address || "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm mb-1">作成日</div>
            <div className="text-white">{formatDate(counterpart.createdAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm mb-1">更新日</div>
            <div className="text-white">{formatDate(counterpart.updatedAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm mb-1">使用回数</div>
            <div className="text-white">{counterpart.usageCount}件</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">紐づいている取引</h2>

        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="w-fit">
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrganizationId}
              onValueChange={handleOrganizationChange}
            />
          </div>
          <div className="w-fit space-y-2">
            <Label>報告年 (西暦)</Label>
            <Input
              type="number"
              value={String(financialYear)}
              onChange={handleYearChange}
              min={1900}
              max={2100}
              required
              className="w-24"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-muted-foreground text-sm">{total}件の取引</div>
          {isPending && <div className="text-muted-foreground text-sm">読み込み中...</div>}
        </div>

        {selectedTransactions.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/30 border border-border rounded-lg">
            <span className="text-white text-sm">
              選択中: <span className="font-medium">{selectedTransactions.length}件</span>
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setRowSelection({})}>
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
          <ClientPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </Card>

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
        politicalOrganizationId={selectedOrganizationId || organizations[0]?.id || ""}
        onClose={handleAssignDialogClose}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}
