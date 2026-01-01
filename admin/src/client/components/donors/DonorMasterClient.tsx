"use client";
import "client-only";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DonorWithUsage, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS, VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";
import { DonorTable } from "@/client/components/donors/DonorTable";
import { DonorFormDialog } from "@/client/components/donors/DonorFormDialog";
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/client/components/ui";

const ALL_TYPES_VALUE = "all" as const;

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
  const [selectedType, setSelectedType] = useState<DonorType | typeof ALL_TYPES_VALUE>(
    donorType ?? ALL_TYPES_VALUE,
  );

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
    const typeParam = selectedType === ALL_TYPES_VALUE ? undefined : selectedType;
    router.push(
      buildUrl({
        q: searchInput.trim(),
        type: typeParam,
        page: "1",
      }),
    );
  };

  const handleTypeChange = (newType: DonorType | typeof ALL_TYPES_VALUE) => {
    setSelectedType(newType);
    const typeParam = newType === ALL_TYPES_VALUE ? undefined : newType;
    router.push(
      buildUrl({
        q: searchQuery,
        type: typeParam,
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
    setSelectedType(ALL_TYPES_VALUE);
    router.push("/donors");
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">寄付者マスタ管理</h1>
        <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
          新規作成
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="名前・住所・職業で検索..."
            aria-label="寄付者を名前・住所・職業で検索"
            className="flex-1 min-w-[200px] max-w-md"
          />
          <Select
            value={selectedType}
            onValueChange={(value) => handleTypeChange(value as DonorType | typeof ALL_TYPES_VALUE)}
          >
            <SelectTrigger className="w-[160px]" aria-label="寄付者種別でフィルタ">
              <SelectValue placeholder="すべての種別" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TYPES_VALUE}>すべての種別</SelectItem>
              {VALID_DONOR_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {DONOR_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            検索
          </Button>
          {(searchQuery || donorType) && (
            <Button type="button" variant="secondary" onClick={handleClear}>
              クリア
            </Button>
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="前のページへ"
          >
            前へ
          </Button>
          <span className="text-white px-4">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="次のページへ"
          >
            次へ
          </Button>
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
