import "server-only";
import { RESEARCH_FUND_FEEDBACK_URL } from "@/client/lib/header-navigation";

interface ResearchFundSurveyCardProps {
  /** 見出しの id（セクションの aria-labelledby に使う）。ページ内で一意にする */
  headingId: string;
  /** 見出しの段。トップ・議員ページは h2、「まる見え政治資金とは」のようにセクションの中に置くときは h3 */
  headingLevel?: "h2" | "h3";
  /** 置く場所ごとの余白など（外側のセクションに付ける） */
  className?: string;
}

/**
 * 調研費の公開についてのアンケート（Google フォーム）への入口（v9 の .ab-voice.mt-survey-band）。
 * 緑グラデーションのカードに、丸いアイコン・「アンケート」・見出し・説明・「アンケートに答える」ボタンを載せる。
 * PC はアイコン・文・ボタンを横に並べる。SP はアイコンと見出しを横組みにし、説明とボタンはカードの幅いっぱいにする。
 */
export default function ResearchFundSurveyCard({
  headingId,
  headingLevel: Heading = "h2",
  className = "",
}: ResearchFundSurveyCardProps) {
  return (
    <section aria-labelledby={headingId} className={className}>
      <div
        data-reveal
        className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-[14px] rounded-[32px] bg-[linear-gradient(120deg,#A3E7DC_0%,#CFF1E0_100%)] px-5 py-6 shadow-[0_8px_24px_rgba(15,132,114,0.10)] min-[641px]:flex min-[641px]:gap-7 min-[641px]:px-[clamp(24px,3.6vw,48px)] min-[641px]:py-[clamp(28px,3.6vw,44px)]"
      >
        <span
          aria-hidden="true"
          className="col-start-1 row-span-2 row-start-1 flex size-[52px] flex-none items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(11,79,69,0.18)] min-[641px]:size-[88px]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F8472"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            className="size-[26px] min-[641px]:size-10"
          >
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
            <path d="M8.5 8h7M8.5 11.5h4.5" />
          </svg>
        </span>
        {/* SP は文の塊をほどいて、アイコンの右に「アンケート」と見出し、その下に説明を幅いっぱいに置く */}
        <div className="contents min-[641px]:flex min-[641px]:min-w-0 min-[641px]:flex-1 min-[641px]:flex-col min-[641px]:gap-2">
          <span className="col-start-2 row-start-1 mb-0.5 self-end text-[13px] font-bold tracking-[0.04em] text-[#0F6E60] min-[641px]:mb-0 min-[641px]:self-auto">
            アンケート
          </span>
          <Heading
            id={headingId}
            className="col-start-2 row-start-2 m-0 self-start text-[19px] font-extrabold leading-[1.45] text-black break-keep [overflow-wrap:anywhere] [text-wrap:balance] min-[641px]:self-auto min-[641px]:text-[clamp(20px,2.2vw,26px)]"
          >
            調研費の公開について
            <wbr />
            ご意見をお聞かせください
          </Heading>
          <p className="col-span-full row-start-3 m-0 mt-3.5 text-[15px] leading-[1.85] text-gray-800 [text-wrap:pretty] min-[641px]:mt-0">
            調研費の内容や使い方のガイドラインについて意見を募集しています。いただいた声をもとに今後改善して参ります
          </p>
        </div>
        <a
          href={RESEARCH_FUND_FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="アンケートに答える（Googleフォームが別タブで開きます）"
          className="col-span-full row-start-4 mt-[18px] inline-flex h-[52px] w-full flex-none items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#0B0F0E] px-8 text-[16px] font-extrabold text-white transition-colors hover:bg-[#0F8472] focus-visible:bg-[#0F8472] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0F8472] min-[641px]:mt-0 min-[641px]:h-14 min-[641px]:w-auto min-[641px]:min-w-[240px] min-[641px]:gap-1.5"
        >
          アンケートに答える
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
            className="flex-shrink-0"
          >
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </section>
  );
}
