"use client";
import "client-only";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { CounterpartTable } from "@/client/components/counterparts/CounterpartTable";
import { CounterpartFormDialog } from "@/client/components/counterparts/CounterpartFormDialog";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
import { Button, Input } from "@/client/components/ui";

interface CounterpartMasterClientProps {
  initialCounterparts: CounterpartWithUsage[];
  total: number;
  page: number;
  perPage: number;
  searchQuery?: string;
}

export function CounterpartMasterClient({
  initialCounterparts,
  total,
  page,
  perPage,
  searchQuery,
}: CounterpartMasterClientProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery ?? "");

  const totalPages = Math.ceil(total / perPage);

  const buildUrl = (params: { q?: string; page: number }) => {
    const urlParams = new URLSearchParams();
    if (params.q?.trim()) {
      urlParams.set("q", params.q.trim());
    }
    urlParams.set("page", params.page.toString());
    return `/counterparts?${urlParams.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ q: searchInput, page: 1 }));
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        label="Counterparts"
        title="取引先マスタ管理"
        actions={
          <Button
            type="button"
            className="text-[13px] tracking-[0.06em]"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus />
            新規作成
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-6">
        <form onSubmit={handleSearch} className="mb-2 flex flex-wrap gap-2">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="名前または住所で検索..."
            aria-label="取引先を名前または住所で検索"
            className="min-w-[200px] max-w-[380px] flex-1 border-[1.5px] text-[13px]"
          />
          <Button type="submit" variant="outline" className="text-[13px]">
            <MagnifyingGlass />
            検索
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              onClick={() => {
                setSearchInput("");
                router.push("/counterparts");
              }}
            >
              クリア
            </Button>
          )}
        </form>

        <p className="mb-3 text-[13px] text-muted-foreground">
          {total}件の取引先
          {searchQuery && <span> (検索: &quot;{searchQuery}&quot;)</span>}
        </p>

        <CounterpartTable counterparts={initialCounterparts} onUpdate={handleUpdate} />

        {totalPages > 1 && (
          <StaticPagination
            currentPage={page}
            totalPages={totalPages}
            buildPageUrl={(nextPage) => buildUrl({ q: searchQuery, page: nextPage })}
          />
        )}

        {isCreateDialogOpen && (
          <CounterpartFormDialog
            mode="create"
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              handleUpdate();
            }}
          />
        )}
      </div>
    </div>
  );
}
