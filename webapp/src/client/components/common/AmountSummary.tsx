import CountUpNumber from "@/client/components/common/CountUpNumber";
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
  /**
   * トップページの政党・政治団体のカード（v9）。PC は金額欄の上の罫線を黒にし、
   * SP（〜600px）は 1 行ごとに項目名を左・金額を右に並べる
   */
  home?: boolean;
}

const HOME_CLASSES = {
  list: "min-[641px]:border-t-black",
  cell: "max-[600px]:flex-row max-[600px]:items-baseline max-[600px]:justify-between max-[600px]:gap-3 max-[600px]:py-3.5",
  amount: "max-[600px]:ml-auto max-[600px]:text-right",
  number: "max-[600px]:text-[26px]",
} as const;

const SIZE_CLASSES = {
  default: {
    cell: "min-[601px]:pr-5",
    divider: "min-[601px]:pl-5",
    label: "text-[14px]",
    visual: "flex items-baseline gap-0.5",
    number:
      "font-num text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums min-[601px]:text-[clamp(28px,3.4vw,44px)]",
    unit: "text-[15px]",
    unavailable: "text-[15px]",
  },
  compact: {
    cell: "min-[601px]:pr-3",
    divider: "min-[601px]:pl-3",
    label: "text-[13px]",
    visual: "flex flex-wrap items-baseline gap-0.5",
    number:
      "font-num text-[clamp(17px,1.7vw,22px)] font-bold leading-[1.1] tracking-[-0.01em] tabular-nums",
    unit: "text-[13px]",
    unavailable: "whitespace-normal text-[13px]",
  },
} as const;

/**
 * 見出しカードの金額欄（収入総額・支出総額・収支など。2つか3つ）。罫線で区切って横に並べ、狭い画面では縦に積む。
 * 数字は v9 と同じ書体（Poppins）で、画面に入ったときにカウントアップする。
 */
export default function AmountSummary({
  items,
  size = "default",
  home = false,
}: AmountSummaryProps) {
  const classes = SIZE_CLASSES[size];
  const numberClass = home ? `${classes.number} ${HOME_CLASSES.number}` : classes.number;
  return (
    <dl
      className={`grid grid-cols-1 border-y border-[#DCE4E1] ${
        items.length === 2 ? "min-[601px]:grid-cols-2" : "min-[601px]:grid-cols-3"
      } ${home ? HOME_CLASSES.list : ""}`}
    >
      {items.map((item, index) => {
        const amount = item.amount === null ? null : formatAmount(item.amount);
        return (
          <div
            key={item.label}
            className={`flex min-w-0 flex-col gap-2.5 py-3 min-[601px]:py-[19px] ${classes.cell} ${
              home ? HOME_CLASSES.cell : ""
            } ${
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
            <dd className={`whitespace-nowrap ${home ? HOME_CLASSES.amount : ""}`}>
              {amount === null ? (
                <span className={`font-bold text-[#6B7280] ${classes.unavailable}`}>
                  取得できませんでした
                </span>
              ) : (
                <AccessibleFormattedAmount amount={amount} visualClassName={classes.visual}>
                  <CountUpNumber
                    value={amount.main}
                    amountKey={String(item.amount)}
                    className={numberClass}
                  />
                  {amount.secondary && (
                    <em
                      className={`ml-0.5 mr-1 font-extrabold not-italic text-[#4B5563] ${classes.unit}`}
                    >
                      {amount.secondary}
                    </em>
                  )}
                  {/* 万が 0 で空のときも部品は残す（切り替えで現れたときに 0 から数え直さないように） */}
                  <CountUpNumber
                    value={amount.tertiary}
                    amountKey={String(item.amount)}
                    className={numberClass}
                  />
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
