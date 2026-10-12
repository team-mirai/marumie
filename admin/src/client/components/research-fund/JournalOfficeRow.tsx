import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/client/lib";

/**
 * 詳細カードの「事務所内の管理」の 1 行（ラベル 76px ＋ 値 ＋ 右端の操作）。
 * 行の下に出す補足（精算の可否、まとめて紐づけるかなど）はラベルの列を避けて並べる。
 */
export function JournalOfficeRow({
  label,
  action,
  below,
  className,
  children,
}: {
  label: ReactNode;
  action?: ReactNode;
  below?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("border-b border-border-soft py-[7px]", className)}>
      <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2.5">
        {label}
        <div className="min-w-0 text-[12.5px] break-words">{children}</div>
        {action ? <div className="flex items-center gap-1.5">{action}</div> : <span />}
      </div>
      {below && <div className="mt-1.5 space-y-1.5 pl-[86px]">{below}</div>}
    </div>
  );
}

/** 行の中の文字だけのボタン（変更・精算済にする・破棄など）。ホバーで下線を引く */
export function TextButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-pointer rounded-sm text-xs font-bold whitespace-nowrap text-primary-active transition-colors duration-150 ease-out outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:no-underline",
        className,
      )}
      {...props}
    />
  );
}
