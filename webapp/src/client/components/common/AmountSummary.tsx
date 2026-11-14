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
  /**
   * 文字の大きさ。"compact" はトップページの政治団体カードのように、横に並べた幅の狭いカードで使う。
   * 金額を小さくし、収まらないときは折り返す
   */
  size?: "default" | "compact";
}

const SIZE_CLASSES = {
  default: {
    cell: "min-[601px]:pr-5",
    divider: "min-[601px]:pl-5",
    label: "text-[14px]",
    visual: "flex items-baseline gap-0.5",
    number:
      "text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums min-[601px]:text-[clamp(28px,3.4vw,44px)]",
    unit: "text-[15px]",
    unavailable: "text-[15px]",
  },
  compact: {
    cell: "min-[601px]:pr-3",
    divider: "min-[601px]:pl-3",
    label: "text-[13px]",
    visual: "flex flex-wrap items-baseline gap-0.5",
    number: "text-[clamp(17px,1.7vw,22px)] font-bold leading-[1.1] tracking-[-0.01em] tabular-nums",
    unit: "text-[13px]",
    unavailable: "whitespace-normal text-[13px]",
  },
} as const;

/**
 * 見出しカードの金額欄（収入総額・支出総額・収支など。2つか3つ）。罫線で区切って横に並べ、狭い画面では縦に積む。
 */
export default function AmountSummary({ items, size = "default" }: AmountSummaryProps) {
  const classes = SIZE_CLASSES[size];
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
            className={`flex min-w-0 flex-col gap-2.5 py-3 min-[601px]:py-[19px] ${classes.cell} ${
              index > 0
                ? `border-t border-[#DCE4E1] min-[601px]:border-t-0 min-[601px]:border-l ${classes.divider}`
                : ""
            }`}
          >
            <dt className={`flex items-center gap-2 font-extrabold ${classes.label}`}>
              <i
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: item.color }}
              />
              {item.label}
            </dt>
            <dd className="whitespace-nowrap">
              {amount === null ? (
                <span className={`font-bold text-[#6B7280] ${classes.unavailable}`}>
                  取得できませんでした
                </span>
              ) : (
                <AccessibleFormattedAmount amount={amount} visualClassName={classes.visual}>
                  <b className={classes.number}>{amount.main}</b>
                  {amount.secondary && (
                    <em
                      className={`ml-0.5 mr-1 font-extrabold not-italic text-[#4B5563] ${classes.unit}`}
                    >
                      {amount.secondary}
                    </em>
                  )}
                  {amount.tertiary && <b className={classes.number}>{amount.tertiary}</b>}
                  <em className={`ml-0.5 font-extrabold not-italic text-[#4B5563] ${classes.unit}`}>
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
