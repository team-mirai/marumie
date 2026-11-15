import Image from "next/image";
import Link from "next/link";

interface BreadcrumbsProps {
  /** トップとの間に挟む親ページ（例: 全件ページから見た「チームみらいの収支」） */
  parent?: { label: string; href: string };
  /** 末尾の、いま開いているページの名前（例: 「チームみらいの収支」） */
  current: string;
}

const LINK_CLASS = "font-bold text-[#238778] hover:text-[#0F8472] hover:underline";

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

/** ページ冒頭のパンくず「トップ ›（親ページ ›）いまのページ」。 */
export default function Breadcrumbs({ parent, current }: BreadcrumbsProps) {
  return (
    <nav aria-label="パンくずリスト">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium leading-[1.5]">
        <li className="whitespace-nowrap">
          <Link href="/" className={`inline-flex items-center gap-[5px] ${LINK_CLASS}`}>
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
