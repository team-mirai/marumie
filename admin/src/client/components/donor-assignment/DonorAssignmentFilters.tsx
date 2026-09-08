"use client";
import "client-only";

import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import {
  Input,
  Label,
  Checkbox,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui";

export interface DonorAssignmentFilterValues {
  categoryKey: string;
  searchQuery: string;
  unassignedOnly: boolean;
}

interface DonorAssignmentFiltersProps {
  values: DonorAssignmentFilterValues;
  categoryOptions: { value: string; label: string }[];
  onChange: (changes: Partial<DonorAssignmentFilterValues>) => void;
}

/**
 * 寄付者紐付け一覧の絞り込み。取引先紐付けと同じ語彙（ピル select / input・黒 1.5px 枠・13px）。
 */
export function DonorAssignmentFilters({
  values,
  categoryOptions,
  onChange,
}: DonorAssignmentFiltersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(values.searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ searchQuery: localSearchQuery });
  };

  const handleSearchClear = () => {
    setLocalSearchQuery("");
    onChange({ searchQuery: "" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={values.categoryKey} onValueChange={(v) => onChange({ categoryKey: v })}>
          <SelectTrigger className="w-[200px] border-[1.5px] text-[13px]" aria-label="カテゴリ">
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            type="text"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder="摘要、メモ、相手先で検索..."
            aria-label="摘要、メモ、相手先で検索"
            className="min-w-[200px] max-w-[380px] flex-1 border-[1.5px] text-[13px]"
          />
          <Button type="submit" variant="outline" className="text-[13px]">
            <MagnifyingGlass />
            検索
          </Button>
          {values.searchQuery && (
            <Button
              type="button"
              variant="outline"
              className="text-[13px]"
              onClick={handleSearchClear}
            >
              クリア
            </Button>
          )}
        </form>
      </div>

      <div className="flex flex-wrap gap-5">
        <div className="flex items-center gap-2">
          <Checkbox
            id="unassigned-only"
            checked={values.unassignedOnly}
            onCheckedChange={(checked) => onChange({ unassignedOnly: checked === true })}
          />
          <Label htmlFor="unassigned-only" className="cursor-pointer text-[13px] font-medium">
            未紐付けのみ表示
          </Label>
        </div>
      </div>
    </div>
  );
}
