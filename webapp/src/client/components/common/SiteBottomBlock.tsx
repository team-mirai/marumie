import "server-only";
import DataNotesSection, { type DataNote } from "@/client/components/common/DataNotesSection";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";
import SiteLinkCards from "@/client/components/common/SiteLinkCards";

/**
 * 全ページの本文の末尾に置く共通の下部ブロック。
 * 「少しずつ進んでいますが…」の帯 → カード3枚 → データについて の順に並べる。
 * データについての項目は、議員ページなど差し替えるページだけ渡す。
 */
export default function SiteBottomBlock({ dataNotes }: { dataNotes?: DataNote[] }) {
  return (
    <>
      <GradientMessageCard title="少しずつ進んでいますがまだまだです。政治とカネ問題解決に向けて歩み続けます🚶🚶‍♀️">
        政治資金の徹底的な透明化に向けて、国民の皆さまとともに少しずつですが着実に歩んでまいります。
      </GradientMessageCard>
      <SiteLinkCards />
      <DataNotesSection notes={dataNotes} />
    </>
  );
}
