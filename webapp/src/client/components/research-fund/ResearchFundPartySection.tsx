import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundPartyBody from "@/client/components/research-fund/ResearchFundPartyBody";
import type { ResearchFundPartySummaryData } from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";

interface Props {
  data: ResearchFundPartySummaryData;
  updatedAt: string;
}

/**
 * A-6 調査研究費（政党ページ）。
 * 議員リストが「一覧」と「グラフの絞り込み」を兼ねる。
 */
export default function ResearchFundPartySection({ data, updatedAt }: Props) {
  const count = data.politicians.length;

  return (
    <MainColumnCard id="research-fund">
      <CardHeader
        icon={<Image src="/icons/icon-cashflow.svg" alt="Cash flow icon" width={30} height={31} />}
        organizationName={data.organization.displayName}
        title={`議員${count}人の調査研究費サマリー`}
        updatedAt={updatedAt}
        subtitle="国会議員に毎月支給される公費を、何に使ったか"
      />

      <p className="-mt-4 text-[13px] font-bold text-[#6A7383]">{data.coverageLabel}</p>

      {/* 議員ページ B-1 と同じ文言。調研費だけ別の説明にしない。 */}
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

      <ResearchFundPartyBody politicians={data.politicians} financialYear={data.financialYear} />

      <div className="text-right md:hidden">
        <span className="text-xs font-normal leading-[1.33] text-[#9CA3AF]">{updatedAt}</span>
      </div>
    </MainColumnCard>
  );
}
