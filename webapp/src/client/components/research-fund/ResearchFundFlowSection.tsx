import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundFlowChart from "@/client/components/research-fund/ResearchFundFlowChart";
import FinancialSummaryCard from "@/client/components/top-page/features/financial-summary/FinancialSummaryCard";
import { formatAmount } from "@/client/lib/financial-calculator";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

/** B-1 使いみちの流れ。KPI2枚（支給された／議員活動に使った）＋区分トグル＋サンキー。 */
export default function ResearchFundFlowSection({ data, updatedAt }: Props) {
  return (
    <MainColumnCard id="cash-flow">
      <CardHeader
        icon={<Image src="/icons/icon-cashflow.svg" alt="Cash flow icon" width={30} height={31} />}
        organizationName={data.politician.name}
        title="調査研究費の使いみち"
        updatedAt={updatedAt}
        subtitle="議員に毎月100万円支給される公費を、何に使ったか"
      />

      <details className="-mt-4">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 py-1 text-sm font-bold text-[#238778] hover:underline">
          調査研究費とは
        </summary>
        <p className="mt-3 rounded-xl bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] px-5 py-5 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
          <strong className="mb-3 block text-lg font-bold leading-relaxed">
            調査研究費は、政党を通らず国から議員に対して毎月直接支給される公費です。
          </strong>
          政党を経由しないため、政党の収支とは別のお金として公開しています。全額が税金で、議員活動にのみ使えます。選挙運動には使えません。余った分は国庫に返します。（正式名称：調査研究広報滞在費）
        </p>
      </details>

      {/* KPI は2枚だけ。未使用分はカードにしない（デザイン仕様 §5） */}
      <div className="flex flex-col gap-2 md:flex-row">
        <FinancialSummaryCard
          className="w-full md:flex-1"
          title="支給された"
          amount={formatAmount(data.kpi.granted)}
          titleColor="#238778"
          amountColor="#1F2937"
        />
        <FinancialSummaryCard
          className="w-full md:flex-1"
          title="議員活動に使った"
          amount={formatAmount(data.kpi.spent)}
          titleColor="#DC2626"
          amountColor="#1F2937"
        />
      </div>

      <ResearchFundFlowChart sankey={data.sankey} />

      <div className="text-right md:hidden">
        <span className="text-xs font-normal leading-[1.33] text-[#9CA3AF]">{updatedAt}</span>
      </div>
    </MainColumnCard>
  );
}
