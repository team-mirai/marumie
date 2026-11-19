import "server-only";
import type { ReactNode } from "react";
import DataNotesSection, { type DataNote } from "@/client/components/common/DataNotesSection";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";
import NewTabMark from "@/client/components/common/NewTabMark";
import OpenSourceAdoptionSection from "@/client/components/common/OpenSourceAdoptionSection";
import SiteLinkCards from "@/client/components/common/SiteLinkCards";

/** 調研費の公開開始を説明する note の記事。帯の本文からリンクする */
const RESEARCH_FUND_LAUNCH_NOTE_URL = "https://note.com/team_mirai_jp/n/na4db4abee5c8";

interface SiteBottomBlockProps {
  /** データについての項目。議員ページなど差し替えるページだけ渡す */
  dataNotes?: DataNote[];
  /** データについての見出しの付け方。トップは "home"、議員ページは "member"、ほかは既定の "page" */
  notesVariant?: "page" | "home" | "member";
  /** 先頭の一言コメントの帯を差し替える（出入金ページなど）。null なら帯を出さない（「まる見え政治資金とは」） */
  band?: ReactNode | null;
  /** "home" はトップページ（v9）用の詰めた配置 */
  layout?: "default" | "home";
}

/**
 * 全ページの本文の末尾に置く共通の下部ブロック。
 * 「少しずつ進んでいますが…」の帯 → オープンソースの案内（導入希望のフォーム） → カード3枚 → データについて の順に並べる。
 * 帯の本文は議員ページ（notesVariant="member"）だけ v9 に合わせて text-wrap: pretty で折り返す。
 * layout="home" はトップページ（v9）用で、上のセクションとの間を詰め、カード3枚を 1 枚ずつフェードインさせる。
 */
export default function SiteBottomBlock({
  dataNotes,
  notesVariant,
  band,
  layout = "default",
}: SiteBottomBlockProps) {
  const isHome = layout === "home";
  return (
    <>
      {band === undefined ? (
        <GradientMessageCard
          className={isHome ? "-mt-3 min-[641px]:-mt-4" : ""}
          layout={layout}
          title="少しずつ進んでいますがまだまだです。今後も改善を続けます"
          emoji="🏃🏃‍♀️"
          bodyClassName={notesVariant === "member" ? "[text-wrap:pretty]" : ""}
        >
          新たに議員の調研費の公開を開始しました。政治資金の徹底的な透明化に向けて、国民の皆さまとともに着実に歩んでまいります。詳しくは
          <a
            href={RESEARCH_FUND_LAUNCH_NOTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-gray-800 underline"
          >
            こちらのnote
            <NewTabMark />
          </a>
          をお読みください。
        </GradientMessageCard>
      ) : (
        band
      )}
      <OpenSourceAdoptionSection />
      <SiteLinkCards staggerReveal={isHome} />
      <DataNotesSection notes={dataNotes} variant={notesVariant} />
    </>
  );
}
