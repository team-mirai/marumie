import { cn } from "@/client/lib";

/** 詳細の区分（科目）に対応する法律上の区分。null は科目が未確定か区分を持たない科目 */
export function LegalCategoryLabel({
  legalLabel,
  className,
}: {
  legalLabel: string | null;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap text-xs text-muted-foreground", className)}>
      法律上の区分：{legalLabel ?? "未定"}
    </span>
  );
}
