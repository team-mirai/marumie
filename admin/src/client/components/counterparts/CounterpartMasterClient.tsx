"use client";
import "client-only";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CounterpartWithUsage } from "@/server/contexts/report/domain/models/counterpart";
import { CounterpartTable } from "@/client/components/counterparts/CounterpartTable";
import { CounterpartFormDialog } from "@/client/components/counterparts/CounterpartFormDialog";

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) {
      params.set("q", searchInput.trim());
    }
    params.set("page", "1");
    router.push(`/counterparts?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    params.set("page", newPage.toString());
    router.push(`/counterparts?${params.toString()}`);
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">取引先マスタ管理</h1>
        <button
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary text-white border-0 rounded-lg px-4 py-2.5 font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
        >
          新規作成
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="名前または住所で検索..."
            aria-label="取引先を名前または住所で検索"
            className="bg-input text-white border border-border rounded-lg px-3 py-2.5 flex-1 max-w-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
          <button
            type="submit"
            className="bg-secondary text-white border border-border hover:bg-secondary/80 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 cursor-pointer"
          >
            検索
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                router.push("/counterparts");
              }}
              className="bg-secondary text-white border border-border hover:bg-secondary/80 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 cursor-pointer"
            >
              クリア
            </button>
          )}
        </div>
      </form>

      <div className="text-muted-foreground text-sm mb-4">
        {total}件の取引先
        {searchQuery && <span> (検索: &quot;{searchQuery}&quot;)</span>}
      </div>

      <CounterpartTable counterparts={initialCounterparts} onUpdate={handleUpdate} />

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="前のページへ"
            className={`bg-secondary text-white border border-border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary/80 cursor-pointer"
            }`}
          >
            前へ
          </button>
          <span className="text-white px-4">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="次のページへ"
            className={`bg-secondary text-white border border-border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              page >= totalPages
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-secondary/80 cursor-pointer"
            }`}
          >
            次へ
          </button>
        </div>
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
  );
}
