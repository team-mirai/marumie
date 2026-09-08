import type { ReactNode } from "react";
import { cn } from "@/client/lib";

/**
 * 団体基本情報・収支総括表などの「項目名 | 値」形式テーブル。
 * 罫線は行罫線 #E5E5E5、小見出し行は黒 1.5px の下罫線（ハンドオフのテーブル罫線ルール）。
 */

export function KeyValueTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-soft">
      <table className="w-full border-collapse text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

interface KeyValueRowProps {
  label: string;
  value: string;
  /** 金額など、Poppins 右寄せで表示する場合 */
  numeric?: boolean;
}

export function KeyValueRow({ label, value, numeric = false }: KeyValueRowProps) {
  return (
    <tr className="border-b border-border-soft last:border-b-0">
      <th className="w-1/3 bg-background px-4 py-2.5 text-left text-xs font-bold text-foreground">
        {label}
      </th>
      <td
        className={cn(
          "px-4 py-2.5 text-foreground",
          numeric && "text-right font-latin font-semibold",
        )}
      >
        {value}
      </td>
    </tr>
  );
}

export function KeyValueGroupHeader({ title }: { title: string }) {
  return (
    <tr className="border-b-[1.5px] border-border">
      <th
        colSpan={2}
        className="bg-card px-4 py-2.5 text-left text-[13px] font-bold text-foreground"
      >
        {title}
      </th>
    </tr>
  );
}
