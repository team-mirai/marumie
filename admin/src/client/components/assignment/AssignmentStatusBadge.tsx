import { cn, resolveAssignmentStatusBadge } from "@/client/lib";

interface AssignmentStatusBadgeProps {
  assigned: boolean;
}

/** 取引先・寄付者の紐付け状態を示すピルバッジ（11px/700・1.5px 枠）。紐付け済み = teal / 未紐付け = グレー。 */
export function AssignmentStatusBadge({ assigned }: AssignmentStatusBadgeProps) {
  const badge = resolveAssignmentStatusBadge(assigned);
  return (
    <span
      className={cn(
        "inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none whitespace-nowrap",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}
