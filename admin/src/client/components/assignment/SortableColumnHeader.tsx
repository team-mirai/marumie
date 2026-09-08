"use client";
import "client-only";

import { CaretDown, CaretUp, CaretUpDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/client/lib";

interface SortableColumnHeaderProps {
  label: string;
  /** この列で現在ソートしているか */
  active: boolean;
  order: "asc" | "desc";
  onClick: () => void;
  /** 金額列など右寄せの見出しで使う */
  align?: "left" | "right";
}

/**
 * 紐付け一覧のソート可能な列見出し。文字は th と同じ 12px/700、
 * ソート方向は Phosphor のキャレットで示す（アクティブ列は teal）。
 */
export function SortableColumnHeader({
  label,
  active,
  order,
  onClick,
  align = "left",
}: SortableColumnHeaderProps) {
  const Icon = active ? (order === "asc" ? CaretUp : CaretDown) : CaretUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}で${active ? (order === "asc" ? "降順" : "昇順") : "昇順"}に並び替え`}
      className={cn(
        "inline-flex w-full cursor-pointer items-center gap-1 text-xs font-bold transition-colors duration-150 ease-out hover:text-primary-hover",
        align === "right" && "justify-end",
        active ? "text-primary-active" : "text-foreground",
      )}
    >
      {label}
      <Icon className={cn("size-3.5", active ? "text-primary-active" : "text-subtle-foreground")} />
    </button>
  );
}
