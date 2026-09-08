"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AddressBook } from "@phosphor-icons/react/dist/ssr";
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
import { Input, Button, Label } from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { AssignmentSelectionBar } from "@/client/components/assignment/AssignmentSelectionBar";

const ALL_CATEGORIES_VALUE = "__all__";

type SortField = "transactionDate" | "debitAmount" | "categoryKey";

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
    sortField: SortField;
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

  const handleSortChange = (field: SortField) => {
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

  const header = (
    <PageHeader
      label="Counterpart Assignment"
      title="取引先紐付け管理"
      description="取引に対して取引先を紐付けます"
      actions={
        <Button asChild variant="outline" className="text-[13px]">
          <Link href="/counterparts">
            <AddressBook />
            マスタ管理へ
          </Link>
        </Button>
      }
    />
  );

  if (organizations.length === 0) {
    return (
      <div>
        {header}
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            政治団体が登録されていません。先に政治団体を作成してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}

      <div className="rounded-lg border border-border bg-card p-6">
        {/* Toolbar: 団体・報告年 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PoliticalOrganizationSelect
            organizations={organizations}
            value={selectedOrganizationId}
            onValueChange={handleOrganizationChange}
            required
            hideLabel
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="financial-year" className="text-xs font-bold">
              報告年
            </Label>
            <Input
              id="financial-year"
              type="number"
              value={String(financialYear)}
              onChange={handleYearChange}
              min={1900}
              max={2100}
              required
              className="font-latin w-[104px] border-[1.5px] text-[13px]"
            />
          </div>
        </div>

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

        <div className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">
            <span className="font-latin">{total}</span>件の取引
            {unassignedOnly && " (未紐付けのみ)"}
          </p>
          {isPending && (
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-[13px] text-muted-foreground">読み込み中...</p>
            </div>
          )}
        </div>

        <AssignmentSelectionBar
          selectedCount={selectedTransactions.length}
          onBulkAssign={handleBulkAssignClick}
          onClear={() => setRowSelection({})}
        />

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

        <AssignCounterpartDialog
          isOpen={isAssignDialogOpen}
          transactions={assignDialogTransactions}
          allCounterparts={allCounterparts}
          politicalOrganizationId={selectedOrganizationId}
          onClose={handleAssignDialogClose}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </div>
  );
}
