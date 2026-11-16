import "server-only";
import type { ReactNode } from "react";

export interface DataNote {
  title: string;
  body: ReactNode;
}

/** 免責事項（全ページ共通） */
export const DISCLAIMER_NOTE: DataNote = {
  title: "免責事項",
  body: "本サイトで公開するデータは、可能な限り正確かつ最新の情報を反映するよう努めていますが、現時点においてはその正確性・完全性・即時性について保証するものではありません。最終的な収支は、別途公開される「政治資金収支報告書」「選挙運動費用収支報告書」並びに「調査研究広報滞在費に係る使途等報告書」をご確認ください。",
};

const NOTES: DataNote[] = [
  {
    title: "データの出典",
    body: "本サイトに含まれる政治資金収支データは、政党「チームみらい」並びに党首・安野貴博の政治団体である「デジタル民主主義を考える会」の収支を整理したもので、結党した2025年5月以降の仕訳が完了した収支を掲載しています。なお収支データには、政治資金規正法で定義された政治活動に使うお金である「政治資金」と、公職選挙法で定義された選挙運動に使うお金である「選挙資金」の双方が含まれています。また、所属する国会議員の調研費（調査研究広報滞在費）は、2026年2月の当選以降に仕訳が完了した支出を、議員ごとに掲載しています。調研費は政治資金規正法上の「政治資金」ではないため、上記の政治資金収支データとは分けて表示しています。",
  },
  DISCLAIMER_NOTE,
];

interface DataNotesSectionProps {
  /** 項目を差し替えるページ（議員ページなど）だけ渡す。既定はデータの出典・免責事項 */
  notes?: DataNote[];
  /**
   * 見出しの付け方（v9）。
   * - "page": 下層ページ。項目の見出しと本文だけを縦に並べる
   * - "home" / "member": トップ・議員ページ。「データについて」の小見出しと「公開の範囲と出典」の見出しを付け、
   *   項目を 2 段組み（狭い画面では 1 段）にする。見出しの大きさはトップのほうが大きい
   */
  variant?: "page" | "home" | "member";
}

const TITLED_HEADING_CLASS = {
  home: "text-[clamp(26px,3.4vw,48px)] leading-[1.18]",
  member: "text-[clamp(24px,2.8vw,36px)] leading-[1.22]",
} as const;

/** 下部の共通ブロックの「データについて」。 */
export default function DataNotesSection({
  notes = NOTES,
  variant = "page",
}: DataNotesSectionProps) {
  if (variant === "page") {
    return (
      <section
        id="explanation"
        aria-label="データについて"
        className="flex scroll-mt-[100px] flex-col gap-9 rounded-[32px] bg-white px-[18px] py-7 min-[641px]:p-[clamp(28px,4.4vw,64px)]"
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

  return (
    <section
      id="explanation"
      aria-label="データについて"
      className="flex scroll-mt-[100px] flex-col gap-[clamp(32px,4vw,56px)] rounded-[24px] bg-white p-[clamp(24px,5vw,72px)] min-[641px]:rounded-[32px]"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-[13px] font-extrabold text-[#0F8472]">データについて</span>
        <h2
          className={`m-0 break-keep font-black tracking-[0.01em] text-black [font-feature-settings:'palt'] [overflow-wrap:anywhere] ${TITLED_HEADING_CLASS[variant]}`}
        >
          公開の範囲と出典
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-x-16 gap-y-10">
        {notes.map((note) => (
          <div key={note.title}>
            <h3 className="m-0 mb-3.5 text-[17px] font-extrabold text-[#0B0F0E]">{note.title}</h3>
            <p className="m-0 text-[14px] leading-[1.95] text-[#1F2937] [text-wrap:pretty]">
              {note.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
