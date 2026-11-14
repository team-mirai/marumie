import "server-only";
import type { ReactNode } from "react";

export const DATA_NOTE_LINK_CLASS = "font-bold text-[#238778] underline hover:no-underline";

export interface DataNote {
  title: string;
  body: ReactNode;
}

const NOTES: DataNote[] = [
  {
    title: "まる見え政治資金について",
    body: (
      <>
        本プロジェクトは、チームみらいによって政治資金の透明化を目的に開発されたオープンソースソフトウェアです。決済データは、クレジットカード、デビットカード、銀行口座を通じて収集され、現状不定期で更新されています。すでにオープンソースで
        <a
          href="https://github.com/team-mirai-volunteer/marumie"
          target="_blank"
          rel="noopener noreferrer"
          className={DATA_NOTE_LINK_CLASS}
        >
          こちらのGitHub
        </a>
        にて無償公開中であり、政党や所属を問わず利用可能な形で提供しております。開発コミュニティにご興味のある方は
        <a
          href="https://action.team-mir.ai/missions/join-slack"
          target="_blank"
          rel="noopener noreferrer"
          className={DATA_NOTE_LINK_CLASS}
        >
          アクションボード
        </a>
        からSlackにご参加ください。
      </>
    ),
  },
  {
    title: "データの出典",
    body: "本サイトに含まれる政治資金収支データは、政党「チームみらい」並びに党首・安野貴博の政治団体である「デジタル民主主義を考える会」の収支を整理したもので、結党した2025年5月以降の仕訳が完了した収支を掲載しています。なお収支データには、政治資金規正法で定義された政治活動に使うお金である「政治資金」と、公職選挙法で定義された選挙運動に使うお金である「選挙資金」の双方が含まれています。",
  },
  {
    title: "調査研究費について",
    body: "調査研究費（正式名称：調査研究広報滞在費）は、政党を通らず国から国会議員に対して毎月直接支給される公費です。政党を経由しないため、上記の政治資金とは別のお金として、議員ごとに公開しています。金額にかかわらず、公開の準備が整った月の支出を1件ずつ掲載しています。整理が完了していない議員・月は「準備中」と表示され、順次公開していきます。余った分は国庫に返すため、年末時点で確定します。",
  },
  {
    title: "免責事項",
    body: "本サイトで公開するデータは、可能な限り正確かつ最新の情報を反映するよう努めていますが、現時点においてはその正確性・完全性・即時性について保証するものではありません。今後は、これらの側面について一層踏み込んだ公開を目指してまいります。最終的な収支は、別途公開される「政治資金収支報告書」並びに「選挙運動費用収支報告書」をご確認ください。",
  },
];

interface DataNotesSectionProps {
  /** 項目を差し替えるページ（議員ページなど）だけ渡す。既定はこのサイト・データの出典・調査研究費・免責事項 */
  notes?: DataNote[];
}

/** 下部の共通ブロックの「データについて」。 */
export default function DataNotesSection({ notes = NOTES }: DataNotesSectionProps) {
  return (
    <section
      id="explanation"
      aria-label="データについて"
      className="flex scroll-mt-24 flex-col gap-9 rounded-[32px] bg-white px-[18px] py-7 md:p-[clamp(28px,4.4vw,64px)]"
    >
      {notes.map((note) => (
        <div key={note.title}>
          <h3 className="mb-3 text-lg font-extrabold text-[#1F2937]">{note.title}</h3>
          <p className="text-[15px] leading-[1.87] tracking-[0.01em] text-[#1F2937] [text-wrap:pretty]">
            {note.body}
          </p>
        </div>
      ))}
    </section>
  );
}
