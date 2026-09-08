"use client";
import "client-only";

import { Button } from "@/client/components/ui";

interface AssignmentSelectionBarProps {
  selectedCount: number;
  onBulkAssign: () => void;
  onClear: () => void;
}

/**
 * 紐付け一覧の選択件数と一括操作（一括紐付け = teal 塗り / 選択解除 = 黒枠白）を並べるバー。
 */
export function AssignmentSelectionBar({
  selectedCount,
  onBulkAssign,
  onClear,
}: AssignmentSelectionBarProps) {
  const hasSelection = selectedCount > 0;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border-soft bg-secondary px-4 py-2.5">
      <span className="text-[13px] text-muted-foreground">
        選択中: <span className="font-latin font-semibold text-foreground">{selectedCount}</span>件
      </span>
      <Button type="button" size="sm" onClick={onBulkAssign} disabled={!hasSelection}>
        一括紐付け
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={!hasSelection}>
        選択解除
      </Button>
    </div>
  );
}
