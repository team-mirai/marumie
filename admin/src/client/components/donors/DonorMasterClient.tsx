"use client";
import "client-only";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import type { DonorWithUsage, DonorType } from "@/server/contexts/report/domain/models/donor";
import { DONOR_TYPE_LABELS, VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";
import { DonorTable } from "@/client/components/donors/DonorTable";
import { DonorFormDialog } from "@/client/components/donors/DonorFormDialog";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { StaticPagination } from "@/client/components/ui/StaticPagination";
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

  const handleClear = () => {
    setSearchInput("");
    setSelectedType(ALL_TYPES_VALUE);
    router.push("/donors");
  };

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        label="Donors"
        title="寄付者マスタ管理"
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
            placeholder="名前・住所・職業で検索..."
            aria-label="寄付者を名前・住所・職業で検索"
            className="min-w-[200px] max-w-[380px] flex-1 border-[1.5px] text-[13px]"
          />
          <Select
            value={selectedType}
            onValueChange={(value) => handleTypeChange(value as DonorType | typeof ALL_TYPES_VALUE)}
          >
            <SelectTrigger
              className="w-[160px] border-[1.5px] text-[13px]"
              aria-label="寄付者種別でフィルタ"
            >
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
          <Button type="submit" variant="outline" className="text-[13px]">
            <MagnifyingGlass />
            検索
          </Button>
          {(searchQuery || donorType) && (
            <Button type="button" variant="outline" className="text-[13px]" onClick={handleClear}>
              クリア
            </Button>
          )}
        </form>

        <p className="mb-3 text-[13px] text-muted-foreground">
          {total}件の寄付者
          {searchQuery && <span> (検索: &quot;{searchQuery}&quot;)</span>}
          {donorType && <span> (種別: {DONOR_TYPE_LABELS[donorType]})</span>}
        </p>

        <DonorTable donors={initialDonors} onUpdate={handleUpdate} />

        {totalPages > 1 && (
          <StaticPagination
            currentPage={page}
            totalPages={totalPages}
            buildPageUrl={(nextPage) =>
              buildUrl({ q: searchQuery, type: donorType, page: nextPage.toString() })
            }
          />
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
    </div>
  );
}
