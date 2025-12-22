"use client";
import "client-only";

import { useState } from "react";
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

export interface CounterpartAssignmentFilterValues {
  categoryKey: string;
  searchQuery: string;
  unassignedOnly: boolean;
  counterpartRequiredOnly: boolean;
}

interface CounterpartAssignmentFiltersProps {
  values: CounterpartAssignmentFilterValues;
  categoryOptions: { value: string; label: string }[];
  onChange: (values: Partial<CounterpartAssignmentFilterValues>) => void;
}

export function CounterpartAssignmentFilters({
  values,
  categoryOptions,
  onChange,
}: CounterpartAssignmentFiltersProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(values.searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ searchQuery: localSearchQuery });
  };

  return (
    <Card className="p-4 gap-2">
      <h2 className="text-lg font-semibold text-white">絞り込み</h2>
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="w-fit space-y-2">
          <Label>カテゴリ</Label>
          <Select
            value={values.categoryKey}
            onValueChange={(value) => onChange({ categoryKey: value })}
          >
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
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
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
            checked={values.unassignedOnly}
            onChange={(e) => onChange({ unassignedOnly: e.target.checked })}
            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring focus:ring-offset-0"
          />
          <span className="text-white">未紐付けのみ表示</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer h-10">
          <input
            type="checkbox"
            checked={values.counterpartRequiredOnly}
            onChange={(e) => onChange({ counterpartRequiredOnly: e.target.checked })}
            className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring focus:ring-offset-0"
          />
          <span className="text-white">取引先必須のみ表示</span>
        </label>
      </div>
    </Card>
  );
}
