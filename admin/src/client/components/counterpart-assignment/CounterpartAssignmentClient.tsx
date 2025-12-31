"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { RowSelectionState } from "@tanstack/react-table";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import { TransactionWithCounterpartTable } from "./TransactionWithCounterpartTable";
import { AssignCounterpartDialog } from "./AssignCounterpartDialog";
import {
  CounterpartAssignmentFilters,
  type CounterpartAssignmentFilterValues,
} from "./CounterpartAssignmentFilters";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Card, Input, Button, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";

const ALL_CATEGORIES_VALUE = "__all__";

interface CounterpartAssignmentClientProps {
  organizations: PoliticalOrganization[];
  initialTransactions: TransactionWithCounterpart[];
  total: number;
  page: number;
  perPage: number;
  initialFilters: {
    politicalOrganizationId: string;
    financialYear: number;
    unassignedOnly: boolean;
    counterpartRequiredOnly: boolean;
    categoryKey: string;
    searchQuery: string;
    sortField: "transactionDate" | "debitAmount" | "categoryKey";
    sortOrder: "asc" | "desc";
  };
  allCounterparts: Counterpart[];
  categoryOptions: { value: string; label: string }[];
}

export function CounterpartAssignmentClient({
  organizations,
  initialTransactions,
  total,
  page,
  perPage,
  initialFilters,
  allCounterparts,
  categoryOptions: categoryOptionsFromServer,
}: CounterpartAssignmentClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialFinancialYear = useMemo(() => new Date().getFullYear(), []);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    initialFilters.politicalOrganizationId || organizations[0]?.id || "",
  );
  const [financialYear, setFinancialYear] = useState(
    initialFilters.financialYear || initialFinancialYear,
  );
  const [unassignedOnly, setUnassignedOnly] = useState(initialFilters.unassignedOnly);
  const [counterpartRequiredOnly, setCounterpartRequiredOnly] = useState(
    initialFilters.counterpartRequiredOnly,
  );
  const [categoryKey, setCategoryKey] = useState(
    initialFilters.categoryKey || ALL_CATEGORIES_VALUE,
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [sortField, setSortField] = useState(initialFilters.sortField);
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignDialogTransactions, setAssignDialogTransactions] = useState<
    TransactionWithCounterpart[]
  >([]);

  const selectedTransactions = useMemo(() => {
    return initialTransactions.filter((t) => rowSelection[t.id]);
  }, [initialTransactions, rowSelection]);

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

  const handleAssignSuccess = (count: number) => {
    setRowSelection({});
    setIsAssignDialogOpen(false);
    setAssignDialogTransactions([]);
    toast.success(`${count}件の紐付けが完了しました`);
    router.refresh();
  };

  const categoryOptions = useMemo(() => {
    return [
      { value: ALL_CATEGORIES_VALUE, label: "すべてのカテゴリ" },
      ...categoryOptionsFromServer,
    ];
  }, [categoryOptionsFromServer]);

  const totalPages = Math.ceil(total / perPage);

  const buildUrl = (params: {
    orgId?: string;
    year?: number;
    unassigned?: boolean;
    counterpartRequired?: boolean;
    category?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("orgId", params.orgId ?? selectedOrganizationId);
    searchParams.set("year", String(params.year ?? financialYear));
    searchParams.set("unassigned", String(params.unassigned ?? unassignedOnly));
    searchParams.set(
      "counterpartRequired",
      String(params.counterpartRequired ?? counterpartRequiredOnly),
    );
    const categoryForUrl = params.category ?? categoryKey;
    const normalizedCategory = categoryForUrl === ALL_CATEGORIES_VALUE ? "" : categoryForUrl;
    if (normalizedCategory) {
      searchParams.set("category", normalizedCategory);
    }
    if (params.search ?? searchQuery) {
      searchParams.set("search", params.search ?? searchQuery);
    }
    searchParams.set("sort", params.sort ?? sortField);
    searchParams.set("order", params.order ?? sortOrder);
    searchParams.set("page", String(params.page ?? 1));
    return `/assign/counterparts?${searchParams.toString()}`;
  };

  const handleFilterChange = (changes: Partial<CounterpartAssignmentFilterValues>) => {
    if (changes.categoryKey !== undefined) {
      setCategoryKey(changes.categoryKey);
    }
    if (changes.searchQuery !== undefined) {
      setSearchQuery(changes.searchQuery);
    }
    if (changes.unassignedOnly !== undefined) {
      setUnassignedOnly(changes.unassignedOnly);
    }
    if (changes.counterpartRequiredOnly !== undefined) {
      setCounterpartRequiredOnly(changes.counterpartRequiredOnly);
    }

    startTransition(() => {
      router.push(
        buildUrl({
          category: changes.categoryKey ?? categoryKey,
          search: changes.searchQuery ?? searchQuery,
          unassigned: changes.unassignedOnly ?? unassignedOnly,
          counterpartRequired: changes.counterpartRequiredOnly ?? counterpartRequiredOnly,
          page: 1,
        }),
      );
    });
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
    let newOrder: "asc" | "desc" = "asc";
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

  if (organizations.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-white">政治団体が登録されていません。先に政治団体を作成してください。</p>
      </Card>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">取引先紐付け管理</h1>
          <p className="text-muted-foreground">
            Transactionに対してCounterpart（取引先）を紐付けます
          </p>
        </div>
        <Link
          href="/counterparts"
          className="bg-secondary text-white border border-border hover:bg-secondary rounded-lg px-4 py-2.5 font-medium transition-colors duration-200"
        >
          マスタ管理へ
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-fit">
            <PoliticalOrganizationSelect
              organizations={organizations}
              value={selectedOrganizationId}
              onValueChange={handleOrganizationChange}
              required
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
      </Card>

      <hr className="border-border" />

      <CounterpartAssignmentFilters
        values={{
          categoryKey,
          searchQuery,
          unassignedOnly,
          counterpartRequiredOnly,
        }}
        categoryOptions={categoryOptions}
        onChange={handleFilterChange}
      />

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-muted-foreground text-sm">
            {total}件のTransaction
            {unassignedOnly && " (未紐付けのみ)"}
          </div>
          {isPending && <div className="text-muted-foreground text-sm">読み込み中...</div>}
        </div>

        <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/30 border border-border rounded-lg">
          <span className="text-white text-sm">
            選択中: <span className="font-medium">{selectedTransactions.length}件</span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleBulkAssignClick}
            disabled={selectedTransactions.length === 0}
          >
            一括紐付け
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
            disabled={selectedTransactions.length === 0}
          >
            選択解除
          </Button>
        </div>

        <TransactionWithCounterpartTable
          transactions={initialTransactions}
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

      <AssignCounterpartDialog
        isOpen={isAssignDialogOpen}
        transactions={assignDialogTransactions}
        allCounterparts={allCounterparts}
        politicalOrganizationId={selectedOrganizationId}
        onClose={handleAssignDialogClose}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}
