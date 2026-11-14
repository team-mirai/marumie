import AccessibleFormattedAmount from "@/client/components/top-page/features/financial-summary/AccessibleFormattedAmount";
import { formatAmount } from "@/client/lib/financial-calculator";

interface AmountSummaryItem {
  label: string;
  /** ラベルの前に置く色の印 */
  color: string;
  /** 円単位の金額。億・万円の表記にして出す。取得できなかったときは null */
  amount: number | null;
}

interface AmountSummaryProps {
  items: AmountSummaryItem[];
}

/**
 * 見出しカードの金額欄（収入総額・支出総額・収支など。2つか3つ）。罫線で区切って横に並べ、狭い画面では縦に積む。
 */
export default function AmountSummary({ items }: AmountSummaryProps) {
  return (
    <dl
      className={`grid grid-cols-1 border-y border-[#DCE4E1] ${
        items.length === 2 ? "min-[601px]:grid-cols-2" : "min-[601px]:grid-cols-3"
      }`}
    >
      {items.map((item, index) => {
        const amount = item.amount === null ? null : formatAmount(item.amount);
        return (
          <div
            key={item.label}
            className={`flex flex-col gap-2.5 py-3 min-[601px]:py-[19px] min-[601px]:pr-5 ${
              index > 0
                ? "border-t border-[#DCE4E1] min-[601px]:border-t-0 min-[601px]:border-l min-[601px]:pl-5"
                : ""
            }`}
          >
            <dt className="flex items-center gap-2 text-[14px] font-extrabold">
              <i
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: item.color }}
              />
              {item.label}
            </dt>
            <dd className="whitespace-nowrap">
              {amount === null ? (
                <span className="text-[15px] font-bold text-[#6B7280]">取得できませんでした</span>
              ) : (
                <AccessibleFormattedAmount
                  amount={amount}
                  visualClassName="flex items-baseline gap-0.5"
                >
                  <b className="text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums min-[601px]:text-[clamp(28px,3.4vw,44px)]">
                    {amount.main}
                  </b>
                  {amount.secondary && (
                    <em className="ml-0.5 mr-1 text-[15px] font-extrabold not-italic text-[#4B5563]">
                      {amount.secondary}
                    </em>
                  )}
                  {amount.tertiary && (
                    <b className="text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums min-[601px]:text-[clamp(28px,3.4vw,44px)]">
                      {amount.tertiary}
                    </b>
                  )}
                  <em className="ml-0.5 text-[15px] font-extrabold not-italic text-[#4B5563]">
                    {amount.unit}
                  </em>
                </AccessibleFormattedAmount>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
