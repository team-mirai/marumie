"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RowSelectionState } from "@tanstack/react-table";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import type { Counterpart } from "@/server/contexts/report/domain/models/counterpart";
import { TransactionWithCounterpartTable } from "./TransactionWithCounterpartTable";
import { BulkAssignModal } from "./BulkAssignModal";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import {
  Card,
  Input,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui";
import { PoliticalOrganizationSelect } from "@/client/components/political-organizations/PoliticalOrganizationSelect";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";

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
    categoryKey: string;
    searchQuery: string;
    sortField: "transactionDate" | "debitAmount" | "categoryKey";
    sortOrder: "asc" | "desc";
  };
  allCounterparts: Counterpart[];
}

export function CounterpartAssignmentClient({
  organizations,
  initialTransactions,
  total,
  page,
  perPage,
  initialFilters,
  allCounterparts,
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
  const [categoryKey, setCategoryKey] = useState(
    initialFilters.categoryKey || ALL_CATEGORIES_VALUE,
  );
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [sortField, setSortField] = useState(initialFilters.sortField);
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

  const selectedTransactions = useMemo(() => {
    return initialTransactions.filter((t) => rowSelection[t.id]);
  }, [initialTransactions, rowSelection]);

  const categoryOptions = useMemo(() => {
    const options = [{ value: ALL_CATEGORIES_VALUE, label: "すべてのカテゴリ" }];
    for (const [, value] of Object.entries(PL_CATEGORIES)) {
      if (value.type === "expense" || value.type === "income") {
        options.push({
          value: value.key,
          label: value.shortLabel || value.category,
        });
      }
    }
    return options;
  }, []);

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
    if (params.unassigned ?? unassignedOnly) {
      searchParams.set("unassigned", "true");
    }
    if (params.category ?? categoryKey) {
      searchParams.set("category", params.category ?? categoryKey);
    }
    if (params.search ?? searchQuery) {
      searchParams.set("search", params.search ?? searchQuery);
    }
    searchParams.set("sort", params.sort ?? sortField);
    searchParams.set("order", params.order ?? sortOrder);
    searchParams.set("page", String(params.page ?? 1));
    return `/counterparts/assignment?${searchParams.toString()}`;
  };

  const handleFilterChange = () => {
    startTransition(() => {
      router.push(buildUrl({ page: 1 }));
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

  const handleUnassignedOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setUnassignedOnly(checked);
    startTransition(() => {
      router.push(buildUrl({ unassigned: checked, page: 1 }));
    });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryKey(value);
    const categoryForUrl = value === ALL_CATEGORIES_VALUE ? "" : value;
    startTransition(() => {
      router.push(buildUrl({ category: categoryForUrl, page: 1 }));
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange();
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
          href="/counterparts/master"
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

      <Card className="p-4 gap-2">
        <h2 className="text-lg font-semibold text-white">絞り込み</h2>
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="w-fit space-y-2">
            <Label>カテゴリ</Label>
            <Select value={categoryKey} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <form onSubmit={handleSearchSubmit} className="w-fit space-y-2">
            <Label htmlFor="search-query">検索</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="摘要、メモで検索..."
                className="w-48"
              />
              <Button type="submit" variant="secondary">
                検索
              </Button>
            </div>
          </form>
          <label className="flex items-center gap-2 cursor-pointer h-10">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={handleUnassignedOnlyChange}
              className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring focus:ring-offset-0"
            />
            <span className="text-white">未紐付けのみ表示</span>
          </label>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-muted-foreground text-sm">
            {total}件のTransaction
            {unassignedOnly && " (未紐付けのみ)"}
          </div>
          {isPending && <div className="text-muted-foreground text-sm">読み込み中...</div>}
        </div>

        {selectedTransactions.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-secondary/30 border border-border rounded-lg">
            <span className="text-white text-sm">
              選択中: <span className="font-medium">{selectedTransactions.length}件</span>
            </span>
            <Button type="button" size="sm" onClick={() => setIsBulkAssignModalOpen(true)}>
              一括紐付け
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              選択解除
            </Button>
          </div>
        )}

        <TransactionWithCounterpartTable
          transactions={initialTransactions}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          allCounterparts={allCounterparts}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          politicalOrganizationId={selectedOrganizationId}
        />

        {totalPages > 1 && (
          <ClientPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </Card>

      <BulkAssignModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        selectedTransactions={selectedTransactions}
        allCounterparts={allCounterparts}
        onSuccess={() => {
          setRowSelection({});
          router.refresh();
        }}
      />
    </div>
  );
}
