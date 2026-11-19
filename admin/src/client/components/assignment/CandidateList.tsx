"use client";
import "client-only";

import type { ReactNode } from "react";
import { cn } from "@/client/lib";

interface CandidateListProps {
  children: ReactNode;
  className?: string;
}

/** 紐付け候補一覧の枠（弱い罫線 `#E5E5E5`・角丸 8px・縦スクロール）。 */
export function CandidateList({ children, className }: CandidateListProps) {
  return (
    <div className={cn("max-h-64 overflow-y-auto rounded-lg border border-border-soft", className)}>
      {children}
    </div>
  );
}

interface CandidateGroupLabelProps {
  children: ReactNode;
}

/** 候補一覧内のグループ見出し（提案 / すべて / 寄付者種別など）。 */
export function CandidateGroupLabel({ children }: CandidateGroupLabelProps) {
  return (
    <div className="bg-secondary px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-subtle-foreground">
      {children}
    </div>
  );
}

interface CandidateListItemProps {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}

/**
 * 候補一覧の 1 行。ラジオ風の丸（選択時 teal）+ 内容。選択行は accent 背景。
 */
export function CandidateListItem({ selected, onSelect, children }: CandidateListItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-secondary",
        selected && "bg-accent hover:bg-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          selected ? "border-primary" : "border-disabled-border",
        )}
      >
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

interface CandidateEmptyProps {
  children: ReactNode;
}

/** 候補が 0 件のときの表示。 */
export function CandidateEmpty({ children }: CandidateEmptyProps) {
  return <div className="px-3 py-4 text-center text-sm text-muted-foreground">{children}</div>;
}
