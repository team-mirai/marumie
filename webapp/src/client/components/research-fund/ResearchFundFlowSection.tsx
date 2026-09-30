import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundFlowChart from "@/client/components/research-fund/ResearchFundFlowChart";
import ResearchFundKpiCard from "@/client/components/research-fund/ResearchFundKpiCard";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

/** 2-1 収支の流れ。KPI2枚（支給総額／支出総額）＋区分タブ＋サンキー。 */
export default function ResearchFundFlowSection({ data, updatedAt }: Props) {
  // SP は右上に出さず、グラフの下に「2026年2月〜8月支給分　2026.8.20更新」と1行で出す。
  const bottomNote = [data.grantPeriodLabel, updatedAt].filter((text) => text).join("　");

  return (
    <MainColumnCard id="cash-flow">
      <CardHeader
        icon={<Image src="/icons/icon-cashflow.svg" alt="Cash flow icon" width={30} height={31} />}
        organizationName={`${data.politician.name}・調研費`}
        title="収支の流れ"
        updatedAt={updatedAt}
        updatedAtNote={data.grantPeriodLabel ?? undefined}
        subtitle="議員に毎月100万円支給される公費を、何に使ったか"
      />

      <details className="-mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-bold text-[#238778] hover:underline [&::-webkit-details-marker]:hidden">
          調研費とは
          <Image src="/icons/icon-chevron-down.svg" alt="" width={18} height={18} />
        </summary>
        <p className="mt-3 rounded-xl bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] px-5 py-5 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
          <strong className="mb-3 block text-lg font-bold leading-relaxed">
            調研費は、国会議員の議員活動のために国から支給される公費です。
          </strong>
          年末までに使われなかった残額は国庫に返納されます。政治資金規正法上の「政治資金」ではありませんが、チームみらいでは透明性の観点から本サイトで公開しています。（正式名称：調査研究広報滞在費、旧・文書通信交通滞在費）
        </p>
      </details>

      {/* KPI は2枚だけ。未使用分はカードにしない（未使用はサンキーの末尾ノードとしてのみ出す） */}
      <div className="flex flex-wrap items-stretch gap-2">
        <ResearchFundKpiCard title="支給総額" amount={data.kpi.granted} titleColor="#238778" />
        <ResearchFundKpiCard title="支出総額" amount={data.kpi.spent} titleColor="#DC2626" />
      </div>

      <div>
        <ResearchFundFlowChart sankey={data.sankey} />
        {bottomNote && (
          <div className="mt-2 text-right text-xs leading-[1.33] text-[#9CA3AF] md:hidden">
            {bottomNote}
          </div>
        )}
      </div>
    </MainColumnCard>
  );
}
