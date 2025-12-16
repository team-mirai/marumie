"use client";
import "client-only";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";
import { TransactionWithCounterpartTable } from "./TransactionWithCounterpartTable";
import { ClientPagination } from "@/client/components/ui/ClientPagination";
import Card from "@/client/components/ui/Card";
import Selector from "@/client/components/ui/Selector";
import Input from "@/client/components/ui/Input";
import { PL_CATEGORIES } from "@/shared/utils/category-mapping";

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
}

export function CounterpartAssignmentClient({
  organizations,
  initialTransactions,
  total,
  page,
  perPage,
  initialFilters,
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
  const [categoryKey, setCategoryKey] = useState(initialFilters.categoryKey);
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery);
  const [sortField, setSortField] = useState(initialFilters.sortField);
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder);

  const organizationOptions = organizations.map((org) => ({
    value: org.id,
    label: org.displayName,
  }));

  const categoryOptions = useMemo(() => {
    const options = [{ value: "", label: "すべてのカテゴリ" }];
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
    startTransition(() => {
      router.push(buildUrl({ category: value, page: 1 }));
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
      <Card>
        <p className="text-white">政治団体が登録されていません。先に政治団体を作成してください。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">取引先紐付け管理</h1>
          <p className="text-primary-muted">Transactionに対してCounterpart（取引先）を紐付けます</p>
        </div>
        <a
          href="/counterparts/master"
          className="bg-primary-hover text-white border border-primary-border hover:bg-primary-border rounded-lg px-4 py-2.5 font-medium transition-colors duration-200"
        >
          マスタ管理へ
        </a>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Selector
            value={selectedOrganizationId}
            onChange={handleOrganizationChange}
            options={organizationOptions}
            label="政治団体"
            required
          />
          <Input
            type="number"
            label="報告年 (西暦)"
            value={String(financialYear)}
            onChange={handleYearChange}
            min="1900"
            max="2100"
            required
          />
          <Selector
            value={categoryKey}
            onChange={handleCategoryChange}
            options={categoryOptions}
            label="カテゴリ"
          />
          <form onSubmit={handleSearchSubmit} className="flex flex-col">
            <label htmlFor="search-query" className="text-sm font-medium text-primary-muted mb-1.5">
              検索
            </label>
            <div className="flex gap-2">
              <input
                id="search-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="摘要、メモで検索..."
                className="bg-primary-input text-white border border-primary-border rounded-lg px-3 py-2 flex-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-primary-accent"
              />
              <button
                type="submit"
                className="bg-primary-hover text-white border border-primary-border hover:bg-primary-border rounded-lg px-3 py-2 font-medium transition-colors duration-200 cursor-pointer"
              >
                検索
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={handleUnassignedOnlyChange}
              className="w-4 h-4 rounded border-primary-border bg-primary-input text-primary-accent focus:ring-primary-accent focus:ring-offset-0"
            />
            <span className="text-white">未紐付けのみ表示</span>
          </label>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="text-primary-muted text-sm">
            {total}件のTransaction
            {unassignedOnly && " (未紐付けのみ)"}
          </div>
          {isPending && <div className="text-primary-muted text-sm">読み込み中...</div>}
        </div>

        <TransactionWithCounterpartTable
          transactions={initialTransactions}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {totalPages > 1 && (
          <ClientPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </Card>
    </div>
  );
}
