import Link from "next/link";
import type { CSSProperties } from "react";

interface SiteLinkCard {
  title: string;
  description: string;
  /** カード右下の英字のラベル */
  label: string;
  href: string;
  /** 外部サイトなら別タブで開く */
  external?: { ariaLabel: string };
}

const CARDS: SiteLinkCard[] = [
  {
    title: "まる見え政治資金とは？",
    description: "政治とカネ解決に向けて",
    label: "ABOUT",
    href: "/about",
  },
  {
    title: "よくあるご質問",
    description: "データの見方や公開の範囲について",
    label: "FAQ",
    href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
    external: { ariaLabel: "よくあるご質問（別タブで開きます）" },
  },
  {
    title: "チームみらいについて",
    description: "チームみらいの公式サイトへ",
    label: "TEAM MIRAI",
    href: "https://team-mir.ai/",
    external: { ariaLabel: "チームみらいについて（公式サイトを別タブで開きます）" },
  },
];

/**
 * ホバーすると薄い緑の地に、内側に 1.5px の緑の枠を出す（v9 の .mt-home .mt-panel:hover / .mt-links .mt-panel:hover）。
 * ホバー中もカードの外側の影は残す
 */
const PANEL_CLASS =
  "group flex min-h-[240px] flex-col justify-between gap-14 rounded-[32px] bg-white p-[clamp(28px,4vw,48px)] text-[#0B0F0E] [transition:background-color_0.3s_cubic-bezier(.2,.7,.1,1),box-shadow_0.2s_ease-out] hover:bg-[#E2F6F3] hover:shadow-[inset_0_0_0_1.5px_#0F8472,0_2px_6px_rgba(11,15,14,0.06),0_8px_24px_rgba(11,15,14,0.06)]";

/**
 * SP（640px 以下）の見た目。全ページでトップ（v9）と同じ低いカードにする。
 * 高さを約120px にし、文字は左、丸い矢印は右の中央に置く。英字のラベルは題名・説明の下に回す
 */
const SP_CLASSES = {
  panel:
    "max-[640px]:grid max-[640px]:min-h-0 max-[640px]:grid-cols-[minmax(0,1fr)_auto] max-[640px]:items-center max-[640px]:gap-x-4 max-[640px]:gap-y-2.5 max-[640px]:rounded-[24px] max-[640px]:pb-5 max-[640px]:pl-6 max-[640px]:pr-5 max-[640px]:pt-[22px]",
  text: "max-[640px]:col-start-1 max-[640px]:row-start-1",
  title: "max-[640px]:text-[20px]",
  description: "max-[640px]:mt-1.5 max-[640px]:text-[14px] max-[640px]:leading-[1.7]",
  bottom: "max-[640px]:contents",
  label: "max-[640px]:col-start-1 max-[640px]:row-start-2",
  circle:
    "max-[640px]:col-start-2 max-[640px]:row-span-2 max-[640px]:row-start-1 max-[640px]:h-12 max-[640px]:w-12",
} as const;

function CardBody({ card }: { card: SiteLinkCard }) {
  return (
    <>
      <span className={SP_CLASSES.text}>
        <span
          className={`block break-keep text-[clamp(22px,2.3vw,30px)] font-black leading-[1.25] tracking-[0.01em] [overflow-wrap:anywhere] ${SP_CLASSES.title}`}
        >
          {card.title}
        </span>
        <span
          className={`mt-3 block text-[15px] leading-[1.8] text-[#4B5563] ${SP_CLASSES.description}`}
        >
          {card.description}
        </span>
      </span>
      <span className={`flex items-end justify-between gap-4 ${SP_CLASSES.bottom}`}>
        <span
          className={`text-[13px] font-bold leading-none tracking-[0.06em] text-[#0F8472] ${SP_CLASSES.label}`}
        >
          {card.label}
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-black bg-white transition-colors duration-300 group-hover:border-[#0F8472] group-hover:bg-[#0F8472] group-hover:text-white ${SP_CLASSES.circle}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={card.external ? "M7 17L17 7M9 7h8v8" : "M9 5l7 7-7 7"} />
          </svg>
        </span>
      </span>
    </>
  );
}

function CardLink({ card }: { card: SiteLinkCard }) {
  const className = `${PANEL_CLASS} ${SP_CLASSES.panel}`;
  return card.external ? (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={card.external.ariaLabel}
      className={className}
    >
      <CardBody card={card} />
    </a>
  ) : (
    <Link href={card.href} className={className}>
      <CardBody card={card} />
    </Link>
  );
}

/**
 * 下部の共通ブロックのカード3枚（まる見え政治資金とは？／よくあるご質問／チームみらいについて）。
 * staggerReveal はトップページ用で、カードを 1 枚ずつ時差をつけてフェードインさせる（v9）。
 * ほかのページはカード3枚をまとめてフェードインさせる。
 */
export default function SiteLinkCards({ staggerReveal = false }: { staggerReveal?: boolean }) {
  return (
    <nav
      data-reveal={staggerReveal ? undefined : true}
      aria-label="このサイトについて"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[clamp(12px,1.6vw,20px)]"
    >
      {CARDS.map((card, index) =>
        staggerReveal ? (
          // フェードインはカードを包む枠で行う（カード自身の背景色の transition を上書きしないため）
          <div
            key={card.label}
            data-reveal
            className="grid"
            style={{ "--reveal-delay": `${index * 0.08}s` } as CSSProperties}
          >
            <CardLink card={card} />
          </div>
        ) : (
          <CardLink key={card.label} card={card} />
        ),
      )}
    </nav>
  );
}
