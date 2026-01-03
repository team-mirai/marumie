"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RowSelectionState } from "@tanstack/react-table";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithDonor } from "@/server/contexts/report/domain/models/transaction-with-donor";
import type { Donor } from "@/server/contexts/report/domain/models/donor";
import { TransactionWithDonorTable } from "./TransactionWithDonorTable";
import { AssignDonorDialog } from "./AssignDonorDialog";
import { DonorAssignmentFilters, type DonorAssignmentFilterValues } from "./DonorAssignmentFilters";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import { Card, Input, Button, Label } from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";

const ALL_CATEGORIES_VALUE = "__all__";

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
    sortField: "transactionDate" | "debitAmount" | "categoryKey";
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
          <h1 className="text-2xl font-bold text-white mb-1">寄付者紐付け管理</h1>
          <p className="text-muted-foreground">Transactionに対してDonor（寄付者）を紐付けます</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/import-donors">CSV一括登録</Link>
        </Button>
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

      <DonorAssignmentFilters
        values={{
          categoryKey,
          searchQuery,
          unassignedOnly,
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
      </Card>

      <AssignDonorDialog
        isOpen={isAssignDialogOpen}
        transactions={assignDialogTransactions}
        allDonors={allDonors}
        onClose={handleAssignDialogClose}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
}
