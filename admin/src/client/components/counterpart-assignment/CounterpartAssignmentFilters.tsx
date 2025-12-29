"use client";
import "client-only";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  Input,
  Button,
  Label,
  Checkbox,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

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

  const handleSearchClear = () => {
    setLocalSearchQuery("");
    onChange({ searchQuery: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label>カテゴリ</Label>
          <Select
            value={values.categoryKey}
            onValueChange={(value) => onChange({ categoryKey: value })}
          >
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
          <Label htmlFor="unassigned-only" className="text-foreground text-sm cursor-pointer">
            未紐付けのみ表示
          </Label>
        </div>

        <div className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            id="counterpart-required-only"
            checked={values.counterpartRequiredOnly}
            onCheckedChange={(checked) => onChange({ counterpartRequiredOnly: checked === true })}
          />
          <Label
            htmlFor="counterpart-required-only"
            className="text-foreground text-sm cursor-pointer flex items-center gap-1"
          >
            取引先必須のみ表示
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <CircleHelp className="size-4 hover:text-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-2 text-left">
                  <p className="font-semibold">取引先必須のカテゴリ</p>
                  <p>
                    政治資金規正法により、以下のカテゴリでは一定金額以上の取引について支払先の氏名・住所を明細に記載する必要があります。
                  </p>
                  <div className="space-y-1">
                    <p className="font-medium">【収入】全額記載必須</p>
                    <ul className="list-disc list-inside text-xs">
                      <li>借入金</li>
                      <li>本部・支部交付金</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">【経常経費】10万円以上</p>
                    <ul className="list-disc list-inside text-xs">
                      <li>光熱水費</li>
                      <li>備品・消耗品費</li>
                      <li>事務所費</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">【政治活動費】5万円以上</p>
                    <ul className="list-disc list-inside text-xs">
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
