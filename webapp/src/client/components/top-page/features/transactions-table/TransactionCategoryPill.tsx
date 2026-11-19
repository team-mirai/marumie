import Link from "next/link";

interface TransactionCategoryPillProps {
  label: string;
  /** 渡すとピルをリンクにする（全件ページでそのカテゴリーに絞り込む） */
  href?: string;
  colors: {
    fontColor: string;
    borderColor: string;
    bgColor: string;
  };
  /** ピルの枠（PC と SP でサイズが違うので呼び出し側から渡す） */
  className: string;
  labelClassName: string;
}

/**
 * 行のカテゴリーのラベル。
 *
 * href があれば見た目（色・枠・サイズ）を変えないまま通常の HTML リンクにし、
 * ホバーで下線を出してリンクだと分かるようにする。
 */
export default function TransactionCategoryPill({
  label,
  href,
  colors,
  className,
  labelClassName,
}: TransactionCategoryPillProps) {
  const style = { backgroundColor: colors.bgColor, borderColor: colors.borderColor };
  const text = (
    <span className={labelClassName} style={{ color: colors.fontColor }}>
      {label}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={`${className} cursor-pointer hover:underline`} style={style}>
        {text}
      </Link>
    );
  }

  return (
    <div className={className} style={style}>
      {text}
    </div>
  );
}
