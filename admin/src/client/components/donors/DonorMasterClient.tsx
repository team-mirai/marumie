"use client";
import "client-only";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DonorWithUsage, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS, VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";
import { DonorTable } from "@/client/components/donors/DonorTable";
import { DonorFormDialog } from "@/client/components/donors/DonorFormDialog";

interface DonorMasterClientProps {
  initialDonors: DonorWithUsage[];
  total: number;
  page: number;
  perPage: number;
  searchQuery?: string;
  donorType?: DonorType;
}

export function DonorMasterClient({
  initialDonors,
  total,
  page,
  perPage,
  searchQuery,
  donorType,
}: DonorMasterClientProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery ?? "");
  const [selectedType, setSelectedType] = useState<DonorType | "">(donorType ?? "");

  const totalPages = Math.ceil(total / perPage);

  const buildUrl = (params: { q?: string; type?: string; page?: string }) => {
    const urlParams = new URLSearchParams();
    if (params.q?.trim()) {
      urlParams.set("q", params.q.trim());
    }
    if (params.type) {
      urlParams.set("type", params.type);
    }
    if (params.page) {
      urlParams.set("page", params.page);
    }
    const queryString = urlParams.toString();
    return queryString ? `/donors?${queryString}` : "/donors";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      buildUrl({
        q: searchInput.trim(),
        type: selectedType || undefined,
        page: "1",
      }),
    );
  };

  const handleTypeChange = (newType: DonorType | "") => {
    setSelectedType(newType);
    router.push(
      buildUrl({
        q: searchQuery,
        type: newType || undefined,
        page: "1",
      }),
    );
  };

  const handlePageChange = (newPage: number) => {
    router.push(
      buildUrl({
        q: searchQuery,
        type: donorType,
        page: newPage.toString(),
      }),
    );
  };

  const handleClear = () => {
    setSearchInput("");
    setSelectedType("");
    router.push("/donors");
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">寄付者マスタ管理</h1>
        <button
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary text-white border-0 rounded-lg px-4 py-2.5 font-medium hover:bg-blue-600 transition-colors duration-200 cursor-pointer"
        >
          新規作成
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="名前・住所・職業で検索..."
            aria-label="寄付者を名前・住所・職業で検索"
            className="bg-input text-white border border-border rounded-lg px-3 py-2.5 flex-1 min-w-[200px] max-w-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value as DonorType | "")}
            aria-label="寄付者種別でフィルタ"
            className="bg-input text-white border border-border rounded-lg px-3 py-2.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          >
            <option value="">すべての種別</option>
            {VALID_DONOR_TYPES.map((type) => (
              <option key={type} value={type}>
                {DONOR_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-secondary text-white border border-border hover:bg-secondary/80 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 cursor-pointer"
          >
            検索
          </button>
          {(searchQuery || donorType) && (
            <button
              type="button"
              onClick={handleClear}
              className="bg-secondary text-white border border-border hover:bg-secondary/80 rounded-lg px-4 py-2.5 font-medium transition-colors duration-200 cursor-pointer"
            >
              クリア
            </button>
          )}
        </div>
      </form>

      <div className="text-muted-foreground text-sm mb-4">
        {total}件の寄付者
        {searchQuery && <span> (検索: &quot;{searchQuery}&quot;)</span>}
        {donorType && <span> (種別: {DONOR_TYPE_LABELS[donorType]})</span>}
      </div>

      <DonorTable donors={initialDonors} onUpdate={handleUpdate} />

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
        <DonorFormDialog
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
