import "server-only";
import Image from "next/image";
import AmountSummary from "@/client/components/common/AmountSummary";
import SectionCard from "@/client/components/layout/SectionCard";
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

/** 収支の流れ。調研費の説明・支給総額と支出総額・区分タブつきのサンキー。議員ページの最初の見出しになる。 */
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
      headingLevel="h1"
    >
      <details className="-mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-bold text-[#238778] hover:underline [&::-webkit-details-marker]:hidden">
          調研費とは
          <Image src="/icons/icon-chevron-down.svg" alt="" width={18} height={18} />
        </summary>
        <div className="mt-3 rounded-xl bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] px-5 py-5 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800 [text-wrap:pretty]">
          <strong className="mb-3 block text-lg font-bold leading-relaxed">
            調研費は、国会議員の議員活動のために国から支給される公費です。
          </strong>
          <p>
            年末までに使われなかった残額は国庫に返納されます。政治資金規正法上の「政治資金」ではありませんが、チームみらいでは透明性の観点から本サイトで公開しています。（正式名称：調査研究広報滞在費、旧・文書通信交通滞在費）
          </p>
        </div>
      </details>

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
            compactEdgeLabels: true,
          }}
          emptyMessage="公開中の調査研究費のデータがありません"
        />
        <p className="mt-2 text-left text-[13px] leading-[1.6] text-[#4B5563] min-[761px]:text-right">
          ※年末までに使われなかった未使用分は国庫に返納されます。
        </p>
      </div>
    </SectionCard>
  );
}
