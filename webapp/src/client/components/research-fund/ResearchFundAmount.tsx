import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

/** 明細の金額。政治団体の出入金明細と同じく、入金は「+」・緑、出金は「-」・赤で出す。 */
export default function ResearchFundAmount({
  row,
  className,
}: {
  row: Pick<ResearchFundExpenseView, "kind" | "amount">;
  className: string;
}) {
  const isIncome = row.kind === "grant";
  return (
    <span
      className={`whitespace-nowrap font-bold ${isIncome ? "text-[#238778]" : "text-[#DC2626]"} ${className}`}
    >
      {isIncome ? "+" : "-"}
      {row.amount.toLocaleString("ja-JP")}
      <span className="text-xs font-normal text-[#4B5563]"> 円</span>
    </span>
  );
}
