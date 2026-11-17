import "server-only";
import Image from "next/image";
import SectionCard from "@/client/components/layout/SectionCard";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import {
  ResearchFundGroupRowsLink,
  ResearchFundHighlightCard,
} from "@/client/components/research-fund/ResearchFundCrossLink";
import type {
  ResearchFundGroupView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  /** 活用方針に添える議員の顔写真の URL。未登録なら null */
  photoUrl: string | null;
  /** 見出しの上の小さな行（例: 「峰島侑也の調研費・2026年」） */
  eyebrow: string;
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

/**
 * 「明細N件を見る」。トップの「詳しく見る」と同じ、下線とつながった矢印のリンク。
 * 見た目は変えずに上下へ押せる範囲を広げる（UX監査 L57）。
 */
const ROWS_LINK_CLASS =
  "relative mr-3.5 inline-flex items-center self-start whitespace-nowrap border-0 bg-transparent pb-[9px] pt-1.5 text-[14px] font-extrabold leading-[1.3] text-[#0A1A17] transition-colors before:absolute before:bottom-1 before:right-[-14px] before:h-[1.5px] before:w-[9px] before:origin-right before:rotate-[38deg] before:rounded-[1px] before:bg-current before:content-[''] after:absolute after:bottom-1 after:left-0 after:right-[-14px] after:h-[1.5px] after:rounded-[1px] after:bg-current after:content-[''] hover:text-[#0F8472] focus-visible:rounded focus-visible:text-[#0F8472] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F8472]";

/** 活用方針と主な用途。議員の顔写真を添えた活用方針と、支出群ごとの用途カード。 */
export default function ResearchFundHighlightsSection({
  data,
  photoUrl,
  eyebrow,
  updatedAt,
}: Props) {
  return (
    <SectionCard
      id="highlights"
      iconSrc="/icons/icon-heart-handshake.svg"
      iconLabel="Heart handshake icon"
      eyebrow={eyebrow}
      title="活用方針と主な用途"
      updatedAt={updatedAt}
    >
      {data.policyComment && (
        // PC は顔写真を円形で左に、SP は写真と見出しを 1 行にして本文をその下に幅いっぱいに出す
        <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-3.5 min-[641px]:grid-cols-[88px_minmax(0,1fr)] min-[641px]:items-start min-[641px]:gap-9">
          <PoliticianAvatar
            photoUrl={photoUrl}
            alt={`${data.politician.name}の写真`}
            className="h-14 w-14 shadow-[0_0_0_3px_#fff,0_2px_8px_rgba(11,15,14,0.12)] min-[641px]:row-span-2 min-[641px]:h-[88px] min-[641px]:w-[88px]"
          />
          <div className="text-[16px] font-bold leading-[1.5] text-gray-800 min-[641px]:flex min-[641px]:items-center min-[641px]:gap-3 min-[641px]:text-[15px] min-[641px]:before:h-0.5 min-[641px]:before:w-6 min-[641px]:before:flex-none min-[641px]:before:rounded-[1px] min-[641px]:before:bg-[#2AA693] min-[641px]:before:content-['']">
            <span
              aria-hidden="true"
              className="mb-0.5 block text-[12px] font-bold tracking-[0.14em] text-[#238778] min-[641px]:hidden"
            >
              POLICY
            </span>
            {data.politician.name}の調研費活用方針
          </div>
          <p className="col-span-full m-0 whitespace-pre-line text-[16px] font-medium leading-[1.95] tracking-[0.02em] text-[#0A1A17] [text-wrap:pretty] min-[641px]:col-span-1 min-[641px]:col-start-2 min-[641px]:max-w-[46em] min-[641px]:text-[19px] min-[641px]:leading-[2]">
            {data.policyComment}
          </p>
        </div>
      )}

      {data.groups.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {data.groups.map((group, index) => (
            <ResearchFundHighlightCard
              key={group.id}
              groupId={group.id}
              // ヘッダーが固定表示なので、ページ内リンクで飛んだときにカードが隠れないよう上を空ける。
              className="flex scroll-mt-[120px] flex-col gap-3 rounded-2xl border p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 items-center gap-[3px] whitespace-nowrap rounded-full bg-[#E2F6F3] px-2 text-[11px] font-bold text-[#238778]">
                  <StarIcon />
                  用途{index + 1}
                </span>
                <span className="text-xs text-[#4B5563]">{formatPeriod(group.period)}</span>
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
                    <span className="sr-only">（別タブで開きます）</span>
                    <Image src="/icons/icon-outerlink.svg" alt="" width={14} height={14} />
                  </a>
                ) : (
                  // 成果物の公開が間に合っていない支出群も隠さず、準備中と明示する。
                  <span key={outcome.label} className="text-sm text-[#9CA3AF]">
                    {outcome.label}：報告は準備中
                  </span>
                ),
              )}

              {group.count > 0 && (
                <ResearchFundGroupRowsLink groupId={group.id} className={ROWS_LINK_CLASS}>
                  明細{group.count}件を見る
                </ResearchFundGroupRowsLink>
              )}
            </ResearchFundHighlightCard>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
