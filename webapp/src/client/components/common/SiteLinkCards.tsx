import Link from "next/link";

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

const PANEL_CLASS =
  "group flex min-h-[240px] flex-col justify-between gap-14 rounded-[32px] bg-white p-[clamp(28px,4vw,48px)] text-[#0B0F0E] transition-colors duration-300 hover:bg-[#E2F6F3]";

/**
 * SP で小さくするときの見た目（v9 のトップ）。高さを約120px にし、文字は左、丸い矢印は右の中央に置く。
 * 英字のラベルは題名・説明の下に回す
 */
const COMPACT_CLASSES = {
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

const NO_COMPACT_CLASSES = {
  panel: "",
  text: "",
  title: "",
  description: "",
  bottom: "",
  label: "",
  circle: "",
} as const;

type CardClasses = Record<keyof typeof COMPACT_CLASSES, string>;

function CardBody({ card, classes }: { card: SiteLinkCard; classes: CardClasses }) {
  return (
    <>
      <span className={classes.text}>
        <span
          className={`block break-keep text-[clamp(22px,2.3vw,30px)] font-black leading-[1.25] tracking-[0.01em] [overflow-wrap:anywhere] ${classes.title}`}
        >
          {card.title}
        </span>
        <span
          className={`mt-3 block text-[15px] leading-[1.8] text-[#4B5563] ${classes.description}`}
        >
          {card.description}
        </span>
      </span>
      <span className={`flex items-end justify-between gap-4 ${classes.bottom}`}>
        <span
          className={`text-[13px] font-bold leading-none tracking-[0.06em] text-[#0F8472] ${classes.label}`}
        >
          {card.label}
        </span>
        <span
          aria-hidden="true"
          className={`inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-black bg-white transition-colors duration-300 group-hover:border-[#30BCA7] group-hover:bg-[#30BCA7] ${classes.circle}`}
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

/**
 * 下部の共通ブロックのカード3枚（まる見え政治資金とは？／よくあるご質問／チームみらいについて）。
 * compactOnSp はトップページ用で、SP ではカードを低くする。
 */
export default function SiteLinkCards({ compactOnSp = false }: { compactOnSp?: boolean }) {
  const classes = compactOnSp ? COMPACT_CLASSES : NO_COMPACT_CLASSES;
  const panelClass = `${PANEL_CLASS} ${classes.panel}`;
  return (
    <nav
      data-reveal
      aria-label="このサイトについて"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[clamp(12px,1.6vw,20px)]"
    >
      {CARDS.map((card) =>
        card.external ? (
          <a
            key={card.label}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={card.external.ariaLabel}
            className={panelClass}
          >
            <CardBody card={card} classes={classes} />
          </a>
        ) : (
          <Link key={card.label} href={card.href} className={panelClass}>
            <CardBody card={card} classes={classes} />
          </Link>
        ),
      )}
    </nav>
  );
}
