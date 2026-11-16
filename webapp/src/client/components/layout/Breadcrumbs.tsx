import Image from "next/image";
import Link from "next/link";

interface BreadcrumbsProps {
  /** トップとの間に挟む親ページ（例: 全件ページから見た「チームみらいの収支」） */
  parent?: { label: string; href: string };
  /** 末尾の、いま開いているページの名前（例: 「チームみらいの収支」） */
  current: string;
  /**
   * 置き場所。"top" はページ冒頭（ナビの下 20px に寄せる）、"bottom" はフッターのすぐ上に重ねて出すもの
   */
  position?: "top" | "bottom";
}

// 見た目の位置は変えずに、上下 13px ずつ押せる範囲を広げる（文字の行 19.5px と合わせて 44px 以上）
const LINK_CLASS =
  "-my-[13px] inline-flex items-center py-[13px] font-bold text-[#238778] hover:text-[#0F8472] hover:underline";

// ナビ（ヘッダーの白い枠）とパンくずの間を、パンくずとカードの間と同じ 20px にそろえる。
// ヘッダーの枠の下端と本文の始まりの差（SP 32px・641px〜 36px・1280px〜 40px）だけ持ち上げる。
// フッターの上のものは、最後のカードとの間を 24px（MainColumn の間隔 32px から 8px 詰める）、フッターとの間を 32px にする
const POSITION_CLASSES = {
  top: "-mt-3 min-[641px]:-mt-4 xl:-mt-5",
  bottom: "-mt-2 mb-3 min-[641px]:-mb-14",
} as const;

function Separator() {
  return (
    <li aria-hidden="true" className="flex">
      <Image
        src="/icons/icon-chevron-right.svg"
        alt=""
        width={12}
        height={12}
        className="opacity-50"
      />
    </li>
  );
}

/** 下層ページのパンくず「トップ ›（親ページ ›）いまのページ」。ページ冒頭とフッターのすぐ上に出す。 */
export default function Breadcrumbs({ parent, current, position = "top" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label={position === "top" ? "パンくずリスト" : "パンくずリスト（ページ下部）"}
      className={POSITION_CLASSES[position]}
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium leading-[1.5]">
        <li className="whitespace-nowrap">
          <Link href="/" className={`gap-[5px] ${LINK_CLASS}`}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="flex-shrink-0"
            >
              <path d="M3.5 10.5 12 3.5l8.5 7" />
              <path d="M5.5 9v10.5h4.5v-6h4v6h4.5V9" />
            </svg>
            トップ
          </Link>
        </li>
        <Separator />
        {parent && (
          <>
            <li className="whitespace-nowrap">
              <Link href={parent.href} className={LINK_CLASS}>
                {parent.label}
              </Link>
            </li>
            <Separator />
          </>
        )}
        <li aria-current="page" className="whitespace-nowrap text-[#374151]">
          {current}
        </li>
      </ol>
    </nav>
  );
}
