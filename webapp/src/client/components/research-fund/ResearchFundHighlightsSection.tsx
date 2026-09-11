import "server-only";
import Image from "next/image";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import type {
  ResearchFundGroupView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

function formatPeriod(period: ResearchFundGroupView["period"]): string {
  if (!period) return "";
  return period.start === period.end
    ? formatDate(period.start)
    : `${formatDate(period.start)}〜${formatDate(period.end)}`;
}

/** B-3 主要な支出の成果。活用方針と、支出群ごとの成果カード。 */
export default function ResearchFundHighlightsSection({ data, updatedAt }: Props) {
  return (
    <MainColumnCard id="highlights">
      <CardHeader
        icon={<Image src="/icons/icon-heart-handshake.svg" alt="" width={30} height={30} />}
        organizationName={data.politician.name}
        title="活用方針と主要な成果"
        updatedAt={updatedAt}
        subtitle="調査研究費の使用方針と、主要な支出に対する成果"
      />

      {data.policyComment && (
        <div className="border-l-4 border-[#9CA3AF] bg-[#F3F4F6] px-6 py-5">
          <div className="text-base font-bold text-gray-800">
            {data.politician.name}の調査研究費の活用方針
          </div>
          <p className="mt-2 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
            {data.policyComment}
          </p>
        </div>
      )}

      {data.groups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.groups.map((group, index) => (
            <div
              key={group.id}
              id={`highlight-${group.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 items-center rounded-full bg-[#E2F6F3] px-2 text-[11px] font-bold text-[#238778]">
                  成果{index + 1}
                </span>
                <span className="text-xs text-[#4B5563]">
                  {formatPeriod(group.period)}
                  {group.count > 0 && `　${group.count}件`}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-gray-800">{group.title}</span>
                <span className="whitespace-nowrap text-xl font-bold tracking-[0.01em] text-[#DC2626]">
                  -{group.amount.toLocaleString("ja-JP")}
                  <span className="text-xs font-normal text-[#4B5563]"> 円</span>
                </span>
              </div>

              {group.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {group.categories.map((category) => (
                    <ResearchFundCategoryPill key={category.label} category={category} />
                  ))}
                </div>
              )}

              <p className="text-sm leading-[1.87] text-gray-800">{group.description}</p>

              {group.outcomes.map((outcome) =>
                outcome.url ? (
                  <a
                    key={outcome.label}
                    href={outcome.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-[#238778] underline hover:no-underline"
                  >
                    {outcome.label}
                    <Image src="/icons/icon-outerlink.svg" alt="" width={14} height={14} />
                  </a>
                ) : (
                  // 成果物の公開が間に合っていない支出群も隠さず、準備中と明示する。
                  <span key={outcome.label} className="text-sm text-[#9CA3AF]">
                    {outcome.label}：報告は準備中
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      )}
    </MainColumnCard>
  );
}
