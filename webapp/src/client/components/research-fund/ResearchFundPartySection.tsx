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
 * 政党トップページの「所属議員｜調研費のサマリー」。
 * 議員チップで選んだ議員の KPI とサンキーを出す。
 */
export default function ResearchFundPartySection({ data, updatedAt }: Props) {
  // SP は右上に出さず、末尾に「2026年2月〜8月支給分　2026.8.20更新」と1行で出す。
  const bottomNote = [data.grantPeriodLabel, updatedAt].filter((text) => text).join("　");

  return (
    <MainColumnCard id="research-fund">
      <CardHeader
        icon={<Image src="/icons/icon-users.svg" alt="Users icon" width={30} height={30} />}
        organizationName="所属議員"
        title="調研費のサマリー"
        updatedAt={updatedAt}
        subtitle="議員に毎月100万円支給される公費を、何に使ったか"
      />

      {/* 調研費ページと同じ構成・同じ文言（デザイン「調研費とは」節） */}
      <details className="-mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-bold text-[#238778] hover:underline [&::-webkit-details-marker]:hidden">
          調研費とは
          <Image src="/icons/icon-chevron-down.svg" alt="" width={18} height={18} />
        </summary>
        <p className="mt-3 rounded-xl bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] px-5 py-5 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
          <strong className="mb-3 block text-lg font-bold leading-relaxed">
            調研費は政党収支とは別のお金ですが、原資が税金であるため本サイトであわせて公開しています。
          </strong>
          法令上は議員活動に充てるもので、選挙運動や政党活動には使えません。年度末に余った分は国庫に返納します。チームみらいでは法令に加え、自主基準として政党によるガイドラインを定めており、追って公開予定です。（正式名称：調査研究広報滞在費、旧・文書通信交通滞在費。いわゆる「旧文通費」とも呼ばれます）
        </p>
      </details>

      <ResearchFundPartyBody politicians={data.politicians} financialYear={data.financialYear} />

      {bottomNote && (
        <div className="text-right md:hidden">
          <span className="text-xs font-normal leading-[1.33] text-[#9CA3AF]">{bottomNote}</span>
        </div>
      )}
    </MainColumnCard>
  );
}
