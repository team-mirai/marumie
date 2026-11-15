"use client";
import "client-only";
import Link from "next/link";
import { useId, useLayoutEffect, useRef, useState } from "react";
import AmountSummary from "@/client/components/common/AmountSummary";
import MistHeadingCard from "@/client/components/common/MistHeadingCard";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import type { SankeyData } from "@/types/sankey";

export interface HomeResearchFundMember {
  slug: string;
  name: string;
  /** ふりがな。未登録なら null */
  nameKana: string | null;
  /** 「衆議院」。未登録なら null */
  houseLabel: string | null;
  /** 表示順の番号（例: 「01」） */
  number: string;
  /** 顔写真の URL。未登録なら null（人型のアイコンにする） */
  photoUrl: string | null;
  /** その議員の調研費ページ */
  href: string;
  /** 例: 「2026.10.23更新」。未設定なら空文字 */
  updatedAt: string;
  /** 例: 「2026年2月〜8月支給分」 */
  periodLabel: string | null;
  kpi: { granted: number; spent: number };
  sankey: { detailed: SankeyData; legal: SankeyData };
}

interface Props {
  /** 調研費を公開中の議員（表示順）。1人以上 */
  members: HomeResearchFundMember[];
  financialYear: number;
}

/** ノードの無い図は「データが無い」として扱う */
function nonEmpty(sankey: SankeyData): SankeyData | null {
  return sankey.nodes.length > 0 ? sankey : null;
}

function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-shrink-0 ${className}`}
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** 選んだ議員の金額・収支の流れ（区分タブつき）・その議員のページへのボタン */
function MemberDetail({ member }: { member: HomeResearchFundMember }) {
  return (
    <>
      {/* 未使用分は金額欄に出さない（サンキーの末尾ノードとしてのみ出す）。議員ページと同じ */}
      <AmountSummary
        items={[
          { label: "支給総額", color: "#2AA693", amount: member.kpi.granted },
          { label: "支出総額", color: "#DC2626", amount: member.kpi.spent },
        ]}
      />
      {/* 議員を切り替えたらタブの選択を初期に戻す */}
      <CashFlowSection
        key={member.slug}
        friendly={nonEmpty(member.sankey.detailed)}
        political={nonEmpty(member.sankey.legal)}
        chart={{
          ariaLabel: `${member.name}の調査研究費の使いみちの流れ図`,
          ariaDescription:
            "調査研究費の支給から使いみちへのお金の流れを示すサンキーダイアグラムです。",
          variant: "research-fund-summary",
          spLayout: "columns",
        }}
        emptyMessage="公開中の調査研究費のデータがありません"
      />
      <Link
        href={member.href}
        className="inline-flex h-12 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#0B0F0E] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white transition-colors hover:bg-[#0F8472] md:h-[52px] md:min-w-[360px] md:self-center md:px-7 md:text-[15px]"
      >
        {member.name}の調研費を詳しく
        <Chevron />
      </Link>
    </>
  );
}

/**
 * トップページの所属議員のカードと、選んだ議員の調研費。カードに金額は出さない。
 * PC はカードを並べ、押した議員の調研費を下のカードに出す。
 * SP はカードを縦に重ねたウォレットにし、タップしたカードを開いてその議員の調研費を出す（開いたカードをもう一度タップすると閉じる）。
 */
export default function HomeResearchFundMembers({ members, financialYear }: Props) {
  const [selectedSlug, setSelectedSlug] = useState(members[0].slug);
  const [spOpen, setSpOpen] = useState(true);
  const selected = members.find((member) => member.slug === selectedSlug) ?? members[0];
  const idPrefix = useId();
  const pcDetailId = `${idPrefix}-detail`;
  const spDetailId = (slug: string) => `${idPrefix}-sp-${slug}`;

  // SP でカードを開閉しても、タップしたカードが画面上で跳ねないよう、選択・開閉が変わった描画のあとにずれをスクロールで打ち消す
  const spCardRefs = useRef(new Map<string, HTMLButtonElement>());
  const anchor = useRef<{ slug: string; top: number } | null>(null);
  useLayoutEffect(() => {
    const pending = anchor.current;
    anchor.current = null;
    const element = pending && spCardRefs.current.get(pending.slug);
    if (!pending || !element) return;
    const diff = element.getBoundingClientRect().top - pending.top;
    if (Math.abs(diff) > 0.5) window.scrollBy(0, diff);
  }, [selectedSlug, spOpen]);

  const pickOnPc = (slug: string) => {
    setSelectedSlug(slug);
    setSpOpen(true);
  };

  const toggleOnSp = (slug: string) => {
    const element = spCardRefs.current.get(slug);
    if (element) anchor.current = { slug, top: element.getBoundingClientRect().top };
    if (slug === selected.slug && spOpen) {
      setSpOpen(false);
    } else {
      setSelectedSlug(slug);
      setSpOpen(true);
    }
  };

  return (
    <>
      {/* PC：議員カードを並べ、押した議員の調研費を下のカードに出す */}
      <div className="hidden flex-col gap-5 md:flex">
        <ul
          aria-label="議員を選ぶ"
          className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,272px),1fr))] gap-3 p-0"
        >
          {members.map((member) => {
            const pressed = member.slug === selected.slug;
            return (
              <li key={member.slug}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-controls={pcDetailId}
                  aria-label={`${member.name}の調研費を下に表示`}
                  onClick={() => pickOnPc(member.slug)}
                  className={`flex w-full cursor-pointer items-center gap-3.5 rounded-[22px] border-0 bg-white py-4 pl-[18px] pr-4 text-left text-[#0B0F0E] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] ${
                    pressed
                      ? "shadow-[inset_0_0_0_2px_#0F8472]"
                      : "shadow-[0_1px_2px_rgba(11,15,14,0.04)] hover:bg-[#E2F6F3]"
                  }`}
                >
                  <PoliticianAvatar
                    photoUrl={member.photoUrl}
                    alt={`${member.name}の写真`}
                    className="h-16 w-16"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {member.nameKana && (
                      <span className="truncate text-[11px] font-semibold leading-[1.4] tracking-[0.04em] text-[#5B6470]">
                        {member.nameKana}
                      </span>
                    )}
                    <span className="truncate text-[17px] font-extrabold leading-[1.35]">
                      {member.name}
                    </span>
                    <span className="flex gap-2 text-[11px] font-bold leading-[1.4] text-[#0F8472]">
                      {member.houseLabel && <span>{member.houseLabel}</span>}
                      <span className="tabular-nums tracking-[0.08em]">No.{member.number}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div id={pcDetailId}>
          <MistHeadingCard
            ariaLabel={`${selected.name}の調研費`}
            avatar={
              <PoliticianAvatar
                photoUrl={selected.photoUrl}
                alt={`${selected.name}の写真`}
                className="h-full w-full"
              />
            }
            title={`${selected.name}の調研費`}
            subtitle={selected.periodLabel ?? undefined}
            updatedAt={selected.updatedAt}
            headingLevel="h3"
            tone="member"
            yearSwitch={
              <span className="text-[14px] font-semibold leading-none tracking-[0.06em] tabular-nums">
                {financialYear}年
              </span>
            }
          >
            <MemberDetail member={selected} />
          </MistHeadingCard>
        </div>
      </div>

      {/* SP：カードを縦に重ねたウォレット。タップしたカードを開き、その下にその議員の調研費を出す */}
      <ul aria-label="議員を選ぶ" className="m-0 flex list-none flex-col p-0 pb-1 pt-1.5 md:hidden">
        {members.map((member, index) => {
          const open = spOpen && member.slug === selected.slug;
          const afterOpen = index > 0 && spOpen && members[index - 1].slug === selected.slug;
          const isLast = index === members.length - 1;
          return (
            <li key={member.slug} className={`flex flex-col ${afterOpen ? "mt-3.5" : ""}`}>
              <button
                ref={(element) => {
                  if (element) spCardRefs.current.set(member.slug, element);
                  else spCardRefs.current.delete(member.slug);
                }}
                type="button"
                aria-expanded={open}
                aria-controls={spDetailId(member.slug)}
                aria-label={`${member.name}の調研費`}
                onClick={() => toggleOnSp(member.slug)}
                className={`mist-surface mist-member-${index % 4} mist-wallet-card z-[2] flex w-full cursor-pointer items-start gap-3 border-0 text-left text-[#0A1A17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#0A1A17] ${
                  index > 0 && !afterOpen ? "-mt-[30px]" : ""
                } ${
                  open
                    ? "aspect-[1.9825] rounded-[20px] py-[18px] pl-[18px] pr-[66px]"
                    : `${isLast ? "min-h-[62px]" : "min-h-[92px]"} rounded-[18px] px-4 pt-3.5 active:translate-y-0.5`
                }`}
              >
                <PoliticianAvatar
                  photoUrl={member.photoUrl}
                  alt={`${member.name}の写真`}
                  className={`shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_4px_10px_-4px_rgba(10,60,52,0.35)] ${
                    open ? "h-11 w-11" : "h-[34px] w-[34px]"
                  }`}
                />
                <span
                  className={`flex min-w-0 flex-1 flex-col justify-center gap-[5px] ${open ? "h-11" : "h-[34px]"}`}
                >
                  <span
                    className={`truncate font-extrabold leading-none tracking-[0.04em] ${open ? "text-[20px]" : "text-[16px]"}`}
                  >
                    {member.name}
                  </span>
                  {member.nameKana && (
                    <span className="truncate text-[12px] font-semibold leading-none tracking-[0.12em] text-[#0A1A17]/80">
                      {member.nameKana}
                    </span>
                  )}
                </span>
                {!open && (
                  <span className="mr-11 flex h-[34px] flex-shrink-0 flex-col items-end justify-center gap-1 text-[12px] font-bold leading-none text-[#0A1A17]/80">
                    {member.houseLabel && <span>{member.houseLabel}</span>}
                    <span className="tabular-nums tracking-[0.12em]">No.{member.number}</span>
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute flex items-center justify-center rounded-full bg-white/50 text-[#0A1A17] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_6px_-2px_rgba(10,60,52,0.25)] backdrop-blur-[10px] ${
                    open
                      ? "right-4 top-[21px] h-[38px] w-[38px]"
                      : "right-3.5 top-3.5 h-[34px] w-[34px]"
                  }`}
                >
                  <Chevron
                    className={`transition-transform duration-[450ms] ${open ? "-rotate-90" : "rotate-90"}`}
                  />
                </span>
                {open && (
                  <>
                    <span className="absolute bottom-5 left-[18px] flex flex-col items-start gap-[5px] leading-none">
                      <span className="text-[12px] font-extrabold tracking-[0.14em]">
                        議員の調研費
                      </span>
                      {member.updatedAt && (
                        <span className="text-[12px] font-semibold tracking-[0.02em] text-[#0A1A17]/80">
                          {member.updatedAt}
                        </span>
                      )}
                    </span>
                    <span className="absolute bottom-5 right-[18px] whitespace-nowrap text-[14px] font-semibold leading-none tracking-[0.06em] tabular-nums">
                      {financialYear}年
                    </span>
                  </>
                )}
              </button>
              {open && (
                <div
                  id={spDetailId(member.slug)}
                  className="relative z-[1] -mt-6 flex flex-col gap-[22px] rounded-[24px] bg-white px-4 pb-5 pt-[50px] shadow-[0_0_0_1px_rgba(11,15,14,0.06),0_18px_30px_-18px_rgba(11,15,14,0.28)]"
                >
                  <MemberDetail member={member} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
