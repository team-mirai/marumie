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

function StarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 6.6L21 9l-5.2 4.3L17.5 21 12 17.3 6.5 21l1.7-7.7L3 9l6.6-.4z" />
    </svg>
  );
}

/** 活用方針と主な用途。活用方針と、支出群ごとの用途カード。 */
export default function ResearchFundHighlightsSection({ data, updatedAt }: Props) {
  return (
    <MainColumnCard id="highlights">
      <CardHeader
        icon={<Image src="/icons/icon-heart-handshake.svg" alt="" width={30} height={30} />}
        organizationName={`${data.politician.name}・調研費`}
        title="活用方針と主な用途"
        updatedAt={updatedAt}
        subtitle="調研費の活用方針と、主要な支出の目的"
      />

      {data.policyComment && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-[#E2F6F3] to-[#EEF6E2] p-6">
          <div className="text-base font-bold text-gray-800">
            {data.politician.name}の調研費の活用方針
          </div>
          <p className="mt-2 text-[15px] leading-[1.87] tracking-[0.01em] text-gray-800">
            {data.policyComment}
          </p>
        </div>
      )}

      {data.groups.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {data.groups.map((group, index) => (
            <div
              key={group.id}
              id={`highlight-${group.id}`}
              // ヘッダーが固定表示なので、ページ内リンクで飛んだときにカードが隠れないよう上を空ける。
              className="flex scroll-mt-[120px] flex-col gap-3 rounded-2xl border border-[#E5E7EB] p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 items-center gap-[3px] whitespace-nowrap rounded-full bg-[#E2F6F3] px-2 text-[11px] font-bold text-[#238778]">
                  <StarIcon />
                  用途{index + 1}
                </span>
                <span className="text-xs text-[#4B5563]">
                  {formatPeriod(group.period)}
                  {group.count > 0 && (
                    <>
                      {"　"}
                      <a
                        href="#transactions"
                        className="font-bold text-[#238778] underline underline-offset-2 hover:no-underline"
                      >
                        {group.count}件
                      </a>
                    </>
                  )}
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

              <p className="text-sm leading-[1.87] text-gray-800 text-pretty">
                {group.description}
              </p>

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
