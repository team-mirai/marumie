import "server-only";
import type { ReactNode } from "react";
import DataNotesSection, { type DataNote } from "@/client/components/common/DataNotesSection";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";
import SiteLinkCards from "@/client/components/common/SiteLinkCards";

interface SiteBottomBlockProps {
  /** データについての項目。議員ページなど差し替えるページだけ渡す */
  dataNotes?: DataNote[];
  /** データについての見出しの付け方。トップは "home"、議員ページは "member"、ほかは既定の "page" */
  notesVariant?: "page" | "home" | "member";
  /** 先頭の一言コメントの帯を差し替える（出入金ページなど） */
  band?: ReactNode;
  /** "home" はトップページ（v9）用の詰めた配置 */
  layout?: "default" | "home";
}

/**
 * 全ページの本文の末尾に置く共通の下部ブロック。
 * 「少しずつ進んでいますが…」の帯 → カード3枚 → データについて の順に並べる。
 * layout="home" はトップページ（v9）用で、上のセクションとの間を詰め、SP ではカード3枚を低くする。
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
      {band ?? (
        <GradientMessageCard
          className={isHome ? "-mt-3 min-[641px]:-mt-4" : ""}
          title="少しずつ進んでいますがまだまだです。今後も改善を続けます"
          emoji="🏃🏃‍♀️"
        >
          政治資金の徹底的な透明化に向けて、国民の皆さまとともに着実に歩んでまいります。
        </GradientMessageCard>
      )}
      <SiteLinkCards compactOnSp={isHome} />
      <DataNotesSection notes={dataNotes} variant={notesVariant} />
    </>
  );
}
