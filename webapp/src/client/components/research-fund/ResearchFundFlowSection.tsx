import "server-only";
import Image from "next/image";
import AmountSummary from "@/client/components/common/AmountSummary";
import SectionCard from "@/client/components/layout/SectionCard";
import { POLICY_NOTE_URL } from "@/client/components/research-fund/ResearchFundIntroLinks";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { SankeyData } from "@/types/sankey";

interface Props {
  data: ResearchFundPageData;
  /** 見出しの上の小さな行（例: 「峰島侑也の調研費・2026年」） */
  eyebrow: string;
  updatedAt: string;
}

/** ノードの無い図は「データが無い」として扱う */
function nonEmpty(sankey: SankeyData): SankeyData | null {
  return sankey.nodes.length > 0 ? sankey : null;
}

/** 「調研費（調査研究広報滞在費）とは」の頭に付ける「？」のアイコン（v9） */
function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17.4" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** 「チームみらいの調研費の使用方針」の頭に付ける書類のアイコン（v9） */
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      className="flex-shrink-0"
    >
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h5M9 13h6M9 17h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 収支の流れ。調研費の説明・支給総額と支出総額・区分タブつきのサンキー。ページの h1 は議員カードの上に別に置くので h2 にする。 */
export default function ResearchFundFlowSection({ data, eyebrow, updatedAt }: Props) {
  return (
    <SectionCard
      id="cash-flow"
      iconSrc="/icons/icon-cashflow.svg"
      iconLabel="Cash flow icon"
      eyebrow={eyebrow}
      title="収支の流れ"
      updatedAt={updatedAt}
      updatedAtNote={data.grantPeriodLabel ?? undefined}
      // v9 でも議員ページの「収支の流れ」の見出しは動かさない
      revealHeading={false}
    >
      {/* 「調研費とは」のすぐ下に、チームみらいの調研費の使用方針（v9）。
          SP は 2 行の文字の中心どうしの間隔をトップと同じ 35px にする。押せる範囲を各 44px 保ったまま重ねないよう、
          「使用方針」の文字を押せる範囲の上寄せにする（上 1px・下 19px）。開いたときの説明文との間は、説明文の枠の下に 9px 足して今と同じにする */}
      <div className="-mt-4 flex flex-col items-start">
        <details className="w-full">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-1 max-[640px]:min-h-11 text-sm font-bold text-[#238778] hover:underline [&::-webkit-details-marker]:hidden">
            <QuestionIcon />
            調研費（調査研究広報滞在費）とは
            <Image src="/icons/icon-chevron-down.svg" alt="" width={18} height={18} />
          </summary>
          <div className="mt-3 max-[640px]:mb-[9px] rounded-xl bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] px-5 py-5 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
            <p className="m-0">
              調研費（調査研究広報滞在費）は、国会議員の調査研究や広報、国民との交流、滞在などの活動のために、国から毎月100万円支給される公費です。政治資金規正法上の「政治資金」ではありませんが、チームみらいでは透明性の観点から本サイトで公開しています。選挙運動には使えません。年内に使わなかった未使用分は国庫に返還します。
            </p>
          </div>
        </details>
        <a
          href={POLICY_NOTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="チームみらいの調研費の使用方針を読む（noteが別タブで開きます）"
          className="inline-flex items-center gap-1.5 py-1 max-[640px]:min-h-11 max-[640px]:pb-[19px] max-[640px]:pt-px text-sm font-bold text-[#238778] no-underline hover:underline"
        >
          <NoteIcon />
          チームみらいの調研費の使用方針
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-shrink-0"
          >
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </div>

      {/* 未使用分は金額欄に出さない（サンキーの末尾ノードとしてのみ出す） */}
      <AmountSummary
        items={[
          { label: "支給総額", color: "#2AA693", amount: data.kpi.granted },
          { label: "支出総額", color: "#DC2626", amount: data.kpi.spent },
        ]}
      />

      <div>
        <CashFlowSection
          friendly={nonEmpty(data.sankey.detailed)}
          political={nonEmpty(data.sankey.legal)}
          chart={{
            ariaLabel: "調査研究費の使いみちの流れ図",
            ariaDescription:
              "調査研究費の支給から使いみちへのお金の流れを示すサンキーダイアグラムです。",
            variant: "research-fund",
          }}
          emptyMessage="公開中の調査研究費のデータがありません"
        />
        <p className="mt-2 text-left text-[13px] leading-[1.6] text-[#4B5563] min-[641px]:text-right">
          ※年内に使わなかった未使用分は国庫に返還します。
        </p>
      </div>
    </SectionCard>
  );
}
