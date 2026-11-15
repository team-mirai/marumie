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
    description: "このサイトが目指していることと、4つの特徴",
    label: "ABOUT",
    href: "/about",
  },
  {
    title: "よくあるご質問",
    description: "データの見方や公開の範囲について",
    label: "FAQ",
    href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
    external: { ariaLabel: "よくあるご質問（別タブで開く）" },
  },
  {
    title: "チームみらいについて",
    description: "チームみらいの公式サイトへ",
    label: "TEAM MIRAI",
    href: "https://team-mir.ai/",
    external: { ariaLabel: "チームみらいについて（公式サイトを別タブで開く）" },
  },
];

const PANEL_CLASS =
  "group flex min-h-[240px] flex-col justify-between gap-14 rounded-[32px] bg-white p-[clamp(28px,4vw,48px)] text-[#0B0F0E] transition-colors duration-300 hover:bg-[#E2F6F3]";

function CardBody({ card }: { card: SiteLinkCard }) {
  return (
    <>
      <span>
        <span className="block break-keep text-[clamp(22px,2.3vw,30px)] font-black leading-[1.25] tracking-[0.01em] [overflow-wrap:anywhere]">
          {card.title}
        </span>
        <span className="mt-3 block text-[15px] leading-[1.8] text-[#4B5563]">
          {card.description}
        </span>
      </span>
      <span className="flex items-end justify-between gap-4">
        <span className="text-[13px] font-semibold leading-none tracking-[0.06em] text-[#0F8472]">
          {card.label}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-black bg-white transition-colors duration-300 group-hover:border-[#30BCA7] group-hover:bg-[#30BCA7]"
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

/** 下部の共通ブロックのカード3枚（まる見え政治資金とは？／よくあるご質問／チームみらいについて）。 */
export default function SiteLinkCards() {
  return (
    <nav
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
            className={PANEL_CLASS}
          >
            <CardBody card={card} />
          </a>
        ) : (
          <Link key={card.label} href={card.href} className={PANEL_CLASS}>
            <CardBody card={card} />
          </Link>
        ),
      )}
    </nav>
  );
}
