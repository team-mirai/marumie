import { cn } from "@/client/lib";

/**
 * 仕訳の法律上の区分。null は科目が未確定か区分を持たない科目。
 * overridden なら仕訳ごとに上書きした区分（#1880）で、科目の既定の区分ではないことを添える。
 */
export function LegalCategoryLabel({
  legalLabel,
  overridden = false,
  className,
}: {
  legalLabel: string | null;
  overridden?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}>
      法律上の区分：{legalLabel ?? "未定"}
      {overridden && <span className="font-bold text-primary-hover">（上書き中）</span>}
    </span>
  );
}
