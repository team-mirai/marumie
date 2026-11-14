import type { ReactNode } from "react";

interface SectionCardProps {
  id: string;
  /** 見出しの左に置くアイコン（public 配下の SVG のパス）。アイコンの形だけを使い、色はテーマの緑で塗る */
  iconSrc: string;
  iconLabel: string;
  /** 見出しの上の小さな行（例: 「チームみらい・2026年」） */
  eyebrow: string;
  title: string;
  /** 例: 「2026.10.23更新」。PC は見出しの右、SP はカードの末尾に出す */
  updatedAt: string;
  /** 更新日に添える補足（例: 「2026年2月〜8月支給分」）。PC は更新日の下、SP は更新日の前に並べる */
  updatedAtNote?: string;
  /** ページの最初の見出しになるカードは h1 にする */
  headingLevel?: "h1" | "h2";
  children: ReactNode;
}

/** 本文の白いセクションのカード。アイコン・小見出し・見出し・更新日の見出し行を持つ。 */
export default function SectionCard({
  id,
  iconSrc,
  iconLabel,
  eyebrow,
  title,
  updatedAt,
  updatedAtNote,
  headingLevel = "h2",
  children,
}: SectionCardProps) {
  const Heading = headingLevel;
  const bottomNote = [updatedAtNote, updatedAt].filter((text) => text).join("　");

  return (
    <section
      id={id}
      className="flex scroll-mt-24 flex-col gap-8 rounded-[32px] bg-white px-[18px] py-7 md:p-[clamp(28px,4.4vw,64px)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-auto items-center gap-4">
          <span className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-[14px] bg-[#E2F6F3]">
            <span
              role="img"
              aria-label={iconLabel}
              className="h-[26px] w-[26px] bg-[#0F8472]"
              style={{
                mask: `url(${iconSrc}) center/contain no-repeat`,
                WebkitMask: `url(${iconSrc}) center/contain no-repeat`,
              }}
            />
          </span>
          <div className="flex min-w-0 flex-auto flex-col gap-0.5">
            <span className="text-[13px] font-bold leading-[1.4] tracking-[0.04em] text-[#238778]">
              {eyebrow}
            </span>
            <Heading className="m-0 break-keep text-[clamp(24px,2.8vw,36px)] font-black leading-[1.22] tracking-[0.01em] text-black [overflow-wrap:anywhere]">
              {title}
            </Heading>
          </div>
        </div>
        {(updatedAt || updatedAtNote) && (
          <span className="hidden flex-shrink-0 flex-col items-end whitespace-nowrap text-[12px] font-medium leading-[1.31] tabular-nums text-[#6B7280] md:flex">
            {updatedAt && <span>{updatedAt}</span>}
            {updatedAtNote && <span>{updatedAtNote}</span>}
          </span>
        )}
      </div>

      {children}

      {bottomNote && (
        <div className="-mt-4 text-right text-[12px] leading-[1.33] text-[#6B7280] md:hidden">
          {bottomNote}
        </div>
      )}
    </section>
  );
}
