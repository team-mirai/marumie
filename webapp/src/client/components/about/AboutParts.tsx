import Link from "next/link";
import type { ReactNode } from "react";
import { NewTabIcon } from "@/client/components/common/NewTabMark";

/** 「まる見え政治資金とは」の白いカード。画面に入るときにフェードインする */
export function AboutCard({
  labelledBy,
  className = "",
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      data-reveal
      className={`flex flex-col rounded-[32px] bg-white px-[18px] py-9 min-[641px]:p-[clamp(28px,4.4vw,64px)] ${className}`}
    >
      {children}
    </section>
  );
}

/** セクションの小見出し（緑の小さな行）と見出し・説明文 */
export function AboutSectionHeading({
  id,
  eyebrow,
  title,
  className = "gap-3.5",
  children,
}: {
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  /** 行どうしの間隔などを上書きする */
  className?: string;
  /** 見出しの下の説明文 */
  children?: ReactNode;
}) {
  return (
    <div className={`flex max-w-[720px] flex-col ${className}`}>
      <span className="text-[13px] font-bold tracking-[0.04em] text-[#238778]">{eyebrow}</span>
      <h2
        id={id}
        className="m-0 break-keep text-[20px] font-bold leading-[1.4] text-black [overflow-wrap:anywhere] [text-wrap:balance] min-[641px]:text-[27px]"
      >
        {title}
      </h2>
      {children && <AboutParagraph>{children}</AboutParagraph>}
    </div>
  );
}

function AboutParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[15px] leading-[1.9] text-[#374151] [text-wrap:pretty]">{children}</p>
  );
}

const CHEVRON_PATH = "M9 5l7 7-7 7";

/** 黒い丸ボタン（v9 の .mt-card-btn.mt-btn-sm）。サイト内のページへ移る */
export function AboutCtaLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-[52px] min-w-[220px] items-center justify-center gap-1.5 self-center whitespace-nowrap rounded-full bg-[#0B0F0E] px-7 text-[15px] font-extrabold text-white no-underline transition-colors hover:bg-[#0F8472] focus-visible:bg-[#0F8472] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0F8472]"
    >
      {children}
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
        className="flex-shrink-0 transition-transform group-hover:translate-x-1"
      >
        <path d={CHEVRON_PATH} />
      </svg>
    </Link>
  );
}

/** 緑の文字の外部リンク（別タブで開く）。aria-label に「（〜が別タブで開きます）」を入れる */
export function AboutExternalLink({
  href,
  ariaLabel,
  children,
}: {
  href: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-2 self-start text-[14px] font-bold text-[#238778] no-underline hover:text-[#0F8472] hover:underline"
    >
      {children}
      <NewTabIcon />
    </a>
  );
}
