"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HandHeart, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import type { RowSelectionState } from "@tanstack/react-table";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import { TransactionWithDonorTable } from "./TransactionWithDonorTable";
import { AssignDonorDialog } from "./AssignDonorDialog";
import { DonorAssignmentFilters, type DonorAssignmentFilterValues } from "./DonorAssignmentFilters";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Input, Button, Label } from "@/client/components/ui";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { AssignmentSelectionBar } from "@/client/components/assignment/AssignmentSelectionBar";

const ALL_CATEGORIES_VALUE = "__all__";

type SortField = "transactionDate" | "debitAmount" | "categoryKey";

interface DonorAssignmentClientProps {
  organizations: PoliticalOrganization[];
  initialTransactions: TransactionWithDonor[];
  total: number;
  page: number;
  perPage: number;
  initialFilters: {
    politicalOrganizationId: string;
    financialYear: number;
    unassignedOnly: boolean;
    categoryKey: string;
    searchQuery: string;
    sortField: SortField;
    sortOrder: "asc" | "desc";
  };
  allDonors: Donor[];
  categoryOptions: { value: string; label: string }[];
}

export function DonorAssignmentClient({
  organizations,
  initialTransactions,
  total,
  page,
  perPage,
  initialFilters,
  allDonors,
  categoryOptions: categoryOptionsFromServer,
}: DonorAssignmentClientProps) {
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
  const [categoryKey, setCategoryKey] = useState(
    initialFilters.categoryKey || ALL_CATEGORIES_VALUE,
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [sortField, setSortField] = useState(initialFilters.sortField);
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignDialogTransactions, setAssignDialogTransactions] = useState<TransactionWithDonor[]>(
    [],
  );

  const selectedTransactions = useMemo(() => {
    return initialTransactions.filter((t) => rowSelection[t.id]);
  }, [initialTransactions, rowSelection]);

  const handleAssignClick = (transaction: TransactionWithDonor) => {
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
    if (params.category ?? categoryKey) {
      searchParams.set("category", params.category ?? categoryKey);
    }
    if (params.search ?? searchQuery) {
      searchParams.set("search", params.search ?? searchQuery);
    }
    searchParams.set("sort", params.sort ?? sortField);
    searchParams.set("order", params.order ?? sortOrder);
    searchParams.set("page", String(params.page ?? 1));
    return `/assign/donors?${searchParams.toString()}`;
  };

  const handleFilterChange = (changes: Partial<DonorAssignmentFilterValues>) => {
    if (changes.categoryKey !== undefined) {
      setCategoryKey(changes.categoryKey);
    }
    if (changes.searchQuery !== undefined) {
      setSearchQuery(changes.searchQuery);
    }
    if (changes.unassignedOnly !== undefined) {
      setUnassignedOnly(changes.unassignedOnly);
    }

    const categoryForUrl =
      (changes.categoryKey ?? categoryKey) === ALL_CATEGORIES_VALUE
        ? ""
        : (changes.categoryKey ?? categoryKey);

    startTransition(() => {
      router.push(
        buildUrl({
          category: categoryForUrl,
          search: changes.searchQuery ?? searchQuery,
          unassigned: changes.unassignedOnly ?? unassignedOnly,
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
      label="Donor Assignment"
      title="寄付者紐付け管理"
      description="取引に対して寄付者を紐付けます"
      actions={
        <>
          <Button asChild variant="outline" className="text-[13px]">
            <Link href="/donors">
              <HandHeart />
              マスタ管理へ
            </Link>
          </Button>
          <Button asChild variant="outline" className="text-[13px]">
            <Link href="/import-donors">
              <UploadSimple />
              CSV一括登録
            </Link>
          </Button>
        </>
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
            <Label htmlFor="financial-year">報告年</Label>
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

        <DonorAssignmentFilters
          values={{
            categoryKey,
            searchQuery,
            unassignedOnly,
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

        <TransactionWithDonorTable
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

        <AssignDonorDialog
          isOpen={isAssignDialogOpen}
          transactions={assignDialogTransactions}
          allDonors={allDonors}
          onClose={handleAssignDialogClose}
          onSuccess={handleAssignSuccess}
        />
      </div>
    </div>
  );
}
