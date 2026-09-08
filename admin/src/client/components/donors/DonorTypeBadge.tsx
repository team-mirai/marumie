import type { DonorType } from "@/server/contexts/report/domain/models/donor";
import { cn, resolveDonorTypeBadge } from "@/client/lib";

interface DonorTypeBadgeProps {
  donorType: DonorType;
}

/** 寄付者種別のピルバッジ（11px/700・1.5px 枠）。個人=teal / 法人=グレー / 政治団体=黒枠。 */
export function DonorTypeBadge({ donorType }: DonorTypeBadgeProps) {
  const badge = resolveDonorTypeBadge(donorType);
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
