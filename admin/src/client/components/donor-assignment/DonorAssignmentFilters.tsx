"use client";
import "client-only";

import { useState } from "react";
import { Input, Label, Checkbox, Button } from "@/client/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label>カテゴリ</Label>
          <Select value={values.categoryKey} onValueChange={(v) => onChange({ categoryKey: v })}>
            <SelectTrigger className="w-full md:w-64">
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
        </div>

        <form onSubmit={handleSearchSubmit} className="flex-1 space-y-2">
          <Label>検索</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              placeholder="摘要、メモ、相手先で検索..."
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              検索
            </Button>
            {values.searchQuery && (
              <Button type="button" variant="ghost" onClick={handleSearchClear}>
                クリア
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            id="unassigned-only"
            checked={values.unassignedOnly}
            onCheckedChange={(checked) => onChange({ unassignedOnly: checked === true })}
          />
          <Label htmlFor="unassigned-only" className="text-white text-sm cursor-pointer">
            未紐付けのみ表示
          </Label>
        </div>
      </div>
    </div>
  );
}
