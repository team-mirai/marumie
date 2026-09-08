"use client";
import "client-only";

import { useState } from "react";
import { MagnifyingGlass, Question } from "@phosphor-icons/react/dist/ssr";
import {
  Input,
  Button,
  Label,
  Checkbox,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
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

/**
 * 取引先紐付け一覧の絞り込み。カテゴリ select・検索 input はピル（黒 1.5px 枠・13px）、
 * チェックボックスは 2 行目にまとめる。
 */
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

  const handleSearchClear = () => {
    setLocalSearchQuery("");
    onChange({ searchQuery: "" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={values.categoryKey}
          onValueChange={(value) => onChange({ categoryKey: value })}
        >
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

        <div className="flex items-center gap-2">
          <Checkbox
            id="counterpart-required-only"
            checked={values.counterpartRequiredOnly}
            onCheckedChange={(checked) => onChange({ counterpartRequiredOnly: checked === true })}
          />
          <Label
            htmlFor="counterpart-required-only"
            className="flex cursor-pointer items-center gap-1 text-[13px] font-medium"
          >
            取引先必須のみ表示
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Question className="size-4 cursor-help text-subtle-foreground transition-colors duration-150 ease-out hover:text-foreground" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-2 text-left">
                  <p className="font-semibold">取引先必須のカテゴリ</p>
                  <p>
                    政治資金規正法により、以下のカテゴリでは一定金額以上の取引について支払先の氏名・住所を明細に記載する必要があります。
                  </p>
                  <div className="space-y-1">
                    <p className="font-medium">【収入】全額記載必須</p>
                    <ul className="list-inside list-disc text-xs">
                      <li>借入金</li>
                      <li>本部・支部交付金</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">【経常経費】5万円以上</p>
                    <ul className="list-inside list-disc text-xs">
                      <li>光熱水費</li>
                      <li>備品・消耗品費</li>
                      <li>事務所費</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">【政治活動費】5万円以上</p>
                    <ul className="list-inside list-disc text-xs">
                      <li>組織活動費、選挙関係費、機関紙誌の発行事業費 等</li>
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </Label>
        </div>
      </div>
    </div>
  );
}
