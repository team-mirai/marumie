import Link from "next/link";
import type { ReactNode } from "react";

interface HomeCardTitleLinkProps {
  href: string;
  /** カードの見出し（例: 「チームみらいの収支」） */
  title: string;
  headingLevel: "h2" | "h3";
  /** 見出しの下に添える年など（例: 「2026年」）。見出しと同じリンクに入れる */
  sub?: ReactNode;
}

const CHEVRON_PATH = "M9 5l7 7-7 7";

/**
 * トップの PC（641px〜）のカード見出し（v9 の `.chev-after`）。
 * タイトル・›・その下の年を 1 つのリンクにし、› はタイトルの文字のすぐ後ろに付ける。
 * ホバーするとタイトルに下線が付き、› が右へ動いて濃い緑になる（年の行には下線を付けない）。
 */
export default function HomeCardTitleLink({
  href,
  title,
  headingLevel,
  sub,
}: HomeCardTitleLinkProps) {
  const Heading = headingLevel;
  // タイトルが折り返しても › だけが次の行に送られないよう、最後の 1 文字と › を改行させずにつなぐ
  const chars = Array.from(title);
  const head = chars.slice(0, -1).join("");
  const last = chars.at(-1) ?? "";

  return (
    <Link
      href={href}
      className="group/go flex min-w-0 flex-[0_1_auto] flex-col gap-1 rounded-md text-inherit no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0F8472]"
    >
      <Heading className="m-0 break-keep text-[clamp(22px,2.6vw,32px)] font-black leading-[1.3] tracking-[0.01em] underline-offset-[3px] [overflow-wrap:anywhere] group-hover/go:underline">
        {head}
        <span className="whitespace-nowrap">
          {last}
          <span
            aria-hidden="true"
            className="ml-[.18em] inline-flex items-center align-[.1em] transition-[color,translate] duration-300 ease-[cubic-bezier(.2,.7,.1,1)] group-hover/go:text-[#0F8472] motion-safe:group-hover/go:translate-x-[3px]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="relative top-[2px] h-[clamp(18px,.7em,20px)] w-[clamp(18px,.7em,20px)] flex-none"
            >
              <path d={CHEVRON_PATH} />
            </svg>
          </span>
        </span>
      </Heading>
      {sub}
    </Link>
  );
}
