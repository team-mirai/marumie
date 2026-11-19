import "server-only";
import SectionCard from "@/client/components/layout/SectionCard";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import {
  ResearchFundGroupRowsLink,
  ResearchFundHighlightRow,
} from "@/client/components/research-fund/ResearchFundCrossLink";
import { type OutcomeSnsKind, outcomeLinkOf } from "@/client/lib/outcome-link";
import type {
  ResearchFundGroupView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  /** 議員の顔写真の URL。未登録なら null（人型のアイコンにする） */
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

/** 用途の番号の前に置く栞の形 */
function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-3.5 flex-none min-[641px]:h-[22px] min-[641px]:w-5"
    >
      <path d="M6.5 3.5h11v17l-5.5-3.9-5.5 3.9z" />
    </svg>
  );
}

/** 報告リンクの SNS の名前の代わりに出すアイコン（v9 の YouTube の赤い再生ボタンと X の記号） */
function SnsIcon({ sns }: { sns: OutcomeSnsKind }) {
  if (sns === "YouTube") {
    return (
      <svg width="18" height="13" viewBox="0 0 28 20" aria-hidden="true" className="flex-none">
        <rect width="28" height="20" rx="5" fill="#FF0000" />
        <path d="M11.2 5.6v8.8l7.6-4.4z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <path
        d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.34l4.37 5.78L17.75 3zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2z"
        fill="#000"
      />
    </svg>
  );
}

function OutcomeLink({ label, url }: { label: string; url: string }) {
  const { sns, text, ariaLabel } = outcomeLinkOf(label, url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="group inline-flex items-center gap-1.5 text-sm font-bold text-[#238778] no-underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#0F8472]"
    >
      {sns && <SnsIcon sns={sns} />}
      <span className="underline underline-offset-[3px] group-hover:no-underline">{text}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="flex-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      >
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
    </a>
  );
}

/** SP では包みの要素をなくし、中身を行の格子に直接並べる（番号と期間 → 名前 → 金額 → 区分 → 説明 → 報告リンク → 明細） */
const SP_FLAT = "contents min-[641px]:flex min-[641px]:min-w-0 min-[641px]:flex-col";
/** SP で行の幅いっぱいに置く */
const SP_FULL = "col-span-full min-[641px]:col-auto";

/** 活用方針と主な用途。活用方針と、支出群ごとの用途の一覧。 */
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
        // PC は顔写真を左に置き、右に緑の短い線つきの小見出しと本文。SP は顔写真と「POLICY」・小見出しを並べ、本文は幅いっぱい
        <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-3.5 min-[641px]:grid-cols-[88px_minmax(0,1fr)] min-[641px]:items-start min-[641px]:gap-9">
          <PoliticianAvatar
            photoUrl={photoUrl}
            alt={`${data.politician.name}の写真`}
            className="h-14 w-14 shadow-[0_0_0_3px_#fff,0_2px_8px_rgba(11,15,14,0.12)] min-[641px]:h-[88px] min-[641px]:w-[88px]"
          />
          <div className="contents min-[641px]:block min-[641px]:min-w-0 min-[641px]:max-w-[46em]">
            <div className="block leading-normal font-bold text-gray-800 min-[641px]:mb-3 min-[641px]:flex min-[641px]:items-center min-[641px]:gap-3 min-[641px]:text-[15px]">
              <span
                aria-hidden="true"
                className="hidden h-0.5 w-6 flex-none rounded-[1px] bg-[#2AA693] min-[641px]:block"
              />
              <span className="mb-0.5 block text-xs tracking-[0.14em] text-[#238778] min-[641px]:hidden">
                POLICY
              </span>
              <b className="block text-base font-bold min-[641px]:text-[15px]">
                {data.politician.name}の調研費活用方針
              </b>
            </div>
            <p className="col-span-full m-0 whitespace-pre-line text-base leading-[1.95] font-medium tracking-[0.02em] text-[#0A1A17] min-[641px]:text-[19px] min-[641px]:leading-[2]">
              {data.policyComment}
            </p>
          </div>
        </div>
      )}

      {data.groups.length > 0 && (
        // PC は目次（番号・名前・説明・金額の4列）、SP は見開き（番号と期間 → 名前 → 金額 → 区分 → 説明 → 報告リンク → 明細）
        <div>
          <div className="hidden border-b-2 border-[#0A1A17] pb-3.5 min-[641px]:block">
            <b className="text-[15px] font-extrabold tracking-[0.08em] text-[#0A1A17]">主な用途</b>
          </div>
          {data.groups.map((group, index) => (
            <ResearchFundHighlightRow
              key={group.id}
              groupId={group.id}
              // ヘッダーが固定表示なので、ページ内リンクで飛んだときに行が隠れないよう上を空ける。
              className="grid scroll-mt-[120px] grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-3 py-7 max-[641px]:border-t max-[641px]:border-[#DCE4E1] max-[641px]:first-of-type:border-t-2 max-[641px]:first-of-type:border-[#0A1A17] max-[641px]:last-of-type:pb-1 min-[641px]:grid-cols-[72px_minmax(0,1fr)_minmax(0,1.15fr)_176px] min-[641px]:gap-x-7 min-[641px]:gap-y-2 min-[641px]:border-b min-[641px]:border-[#DCE4E1] min-[641px]:pt-[34px] min-[641px]:pb-8"
            >
              <span
                aria-hidden="true"
                className="font-num inline-flex items-center gap-1 self-center whitespace-nowrap text-[15px] font-semibold leading-none tracking-[0.02em] text-[#2AA693] tabular-nums min-[641px]:gap-[5px] min-[641px]:self-start min-[641px]:text-2xl min-[641px]:font-bold min-[641px]:tracking-[-0.01em] min-[641px]:text-[#30BCA7]"
              >
                <BookmarkIcon />
                {String(index + 1).padStart(2, "0")}
                <span className="ml-2 h-px w-5 flex-none bg-current min-[641px]:hidden" />
              </span>

              <div className={`${SP_FLAT} min-[641px]:gap-2.5`}>
                <span className="font-num text-[13px] font-medium leading-normal tracking-[0.01em] text-[#4B5563] tabular-nums max-[641px]:order-1 max-[641px]:self-center">
                  {formatPeriod(group.period)}
                </span>
                <h3
                  className={`${SP_FULL} m-0 break-keep text-[19px] font-bold leading-[1.4] text-gray-800 [overflow-wrap:anywhere] max-[641px]:order-2 min-[641px]:text-[21px] min-[641px]:leading-[1.45]`}
                >
                  <span className="sr-only">用途{index + 1} </span>
                  {group.title}
                </h3>
                {group.categories.length > 0 && (
                  <div className={`${SP_FULL} flex flex-wrap gap-1.5 max-[641px]:order-4`}>
                    {group.categories.map((category) => (
                      <ResearchFundCategoryPill key={category.label} category={category} />
                    ))}
                  </div>
                )}
              </div>

              <div className={`${SP_FLAT} min-[641px]:gap-3.5`}>
                <p
                  className={`${SP_FULL} m-0 text-sm leading-[1.87] text-gray-800 max-[641px]:order-5 min-[641px]:text-[15px] min-[641px]:leading-[1.9]`}
                >
                  {group.description}
                </p>
                {group.outcomes.length > 0 && (
                  <div
                    className={`${SP_FULL} flex flex-wrap gap-x-[18px] gap-y-2 max-[641px]:order-6 max-[641px]:mt-0.5`}
                  >
                    {group.outcomes.map((outcome) =>
                      outcome.url ? (
                        <OutcomeLink key={outcome.label} label={outcome.label} url={outcome.url} />
                      ) : (
                        // 成果物の公開が間に合っていない支出群も隠さず、準備中と明示する。
                        <span key={outcome.label} className="text-sm text-[#9CA3AF]">
                          {outcome.label}：報告は準備中
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div
                className={`${SP_FLAT} min-[641px]:items-end min-[641px]:gap-3 min-[641px]:text-right`}
              >
                <span
                  className={`${SP_FULL} font-num justify-self-start whitespace-nowrap text-[26px] font-bold leading-none tracking-[0.01em] text-[#DC2626] tabular-nums max-[641px]:order-3 min-[641px]:text-[28px] min-[641px]:leading-[1.1]`}
                >
                  -{group.amount.toLocaleString("ja-JP")}
                  <small className="font-japanese ml-0.5 text-xs font-normal text-[#4B5563]">
                    円
                  </small>
                </span>
                {group.count > 0 && (
                  <ResearchFundGroupRowsLink
                    groupId={group.id}
                    className={`${SP_FULL} more-link more-link-tight mr-3.5 justify-self-start whitespace-nowrap focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F8472] max-[641px]:order-7 max-[641px]:mt-0.5`}
                  >
                    明細{group.count}件を見る
                  </ResearchFundGroupRowsLink>
                )}
              </div>
            </ResearchFundHighlightRow>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
