"use client";
import "client-only";
import Link from "next/link";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import AmountSummary from "@/client/components/common/AmountSummary";
import ComingSoonPill from "@/client/components/common/ComingSoonPill";
import YearSegment from "@/client/components/common/YearSegment";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { useWalletMorph } from "@/client/lib/use-wallet-morph";
import { toggleOpen } from "@/client/lib/wallet-deck";
import type { SankeyData } from "@/types/sankey";

/** 議員の1年分の調研費 */
export interface HomeResearchFundMemberYear {
  year: number;
  /** その議員のその年の調研費ページ */
  href: string;
  /** 例: 「2026.10.23 更新」。未設定なら空文字 */
  updatedAt: string;
  /** 例: 「2026年2-8月分」 */
  periodLabel: string | null;
  kpi: { granted: number; spent: number };
  sankey: { detailed: SankeyData; legal: SankeyData };
}

export interface HomeResearchFundMember {
  slug: string;
  name: string;
  /** 顔写真の URL。未登録なら null（人型のアイコンにする） */
  photoUrl: string | null;
  /** 公開済みの年の調研費（年の古い順）。1年分以上 */
  years: HomeResearchFundMemberYear[];
}

/** 調研費を非公開のまま「準備中」としてグレーで出す議員。ページは開けないのでリンクにしない */
export interface HomeResearchFundComingSoonMember {
  slug: string;
  name: string;
  /** 顔写真の URL。未登録なら null（人型のアイコンにする） */
  photoUrl: string | null;
  /** 添え書き（例: 「宇佐美議員室は業務逼迫のため、12月中旬を目処に公開予定です。」）。無ければ null */
  note: string | null;
}

interface Props {
  /** 調研費を公開中の議員（表示順）。1人以上 */
  members: HomeResearchFundMember[];
  /** 「準備中」の議員（表示順）。公開中の議員の後ろに並べる */
  comingSoon?: HomeResearchFundComingSoonMember[];
  /** 最初に出す年 */
  defaultYear: number;
}

const CHEVRON_PATH = "M9 5l7 7-7 7";

/** ノードの無い図は「データが無い」として扱う */
function nonEmpty(sankey: SankeyData): SankeyData | null {
  return sankey.nodes.length > 0 ? sankey : null;
}

function Chevron({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-shrink-0 ${className}`}
    >
      <path d={CHEVRON_PATH} />
    </svg>
  );
}

/** 選んだ年の調研費。その年が無ければ最新の年にする */
function yearOf(member: HomeResearchFundMember, year: number): HomeResearchFundMemberYear {
  return member.years.find((item) => item.year === year) ?? member.years[member.years.length - 1];
}

/** 年の切り替えの選択肢。公開済みの年が1つだけなら切り替えは出さない（null） */
function yearOptionsOf(member: HomeResearchFundMember): { year: number }[] | null {
  return member.years.length > 1 ? member.years.map(({ year }) => ({ year })) : null;
}

/**
 * 選んだ議員・年の金額と収支の流れ（区分タブつき）。others はほかの議員の図（切り替えても合計の柱を動かさないために測る）。
 * SP の開いたカードでは、支給総額と支出総額を横に並べる（ラベルの下に金額）
 */
function MemberAmountsAndFlow({
  member,
  year,
  layout,
  others,
  drawIn = true,
}: {
  member: HomeResearchFundMember;
  year: HomeResearchFundMemberYear;
  layout: "pc" | "sp";
  others: SankeyData[];
  /** 図を描き出しの動きで出すか。PC で議員を切り替えた後は false にし、描き終えた形で出す */
  drawIn?: boolean;
}) {
  return (
    <>
      {/* 未使用分は金額欄に出さない（サンキーの末尾ノードとしてのみ出す）。議員ページと同じ */}
      <AmountSummary
        home={layout === "pc"}
        columns={layout === "sp"}
        items={[
          { label: "支給総額", color: "#2AA693", amount: year.kpi.granted },
          { label: "支出総額", color: "#DC2626", amount: year.kpi.spent },
        ]}
      />
      {/* 議員や年を切り替えたらタブの選択を初期に戻す */}
      <CashFlowSection
        key={`${member.slug}-${year.year}`}
        friendly={nonEmpty(year.sankey.detailed)}
        political={nonEmpty(year.sankey.legal)}
        chart={{
          ariaLabel: `${member.name}の調査研究費の使いみちの流れ図`,
          ariaDescription:
            "調査研究費の支給から使いみちへのお金の流れを示すサンキーダイアグラムです。",
          variant: "research-fund-summary",
          spLayout: "columns",
          alternatives: others,
        }}
        emptyMessage="公開中の調査研究費のデータがありません"
        // 「指を広げて拡大」はトップの 1 枚目（チームみらいの収支）の図だけに出す
        pinchHint={false}
        initialDrawIn={drawIn}
      />
    </>
  );
}

/** 図の下に小さく右揃えで出す注記 */
function ReturnNote({ className }: { className: string }) {
  return (
    <p className={`m-0 text-right text-[12px] leading-[1.6] text-[#4B5563] ${className}`}>
      ※年内に使わなかった未使用分は国庫に返還します。
    </p>
  );
}

/** その議員の選んだ年のページへの黒いボタン */
function MemberDetailButton({
  member,
  year,
}: {
  member: HomeResearchFundMember;
  year: HomeResearchFundMemberYear;
}) {
  return (
    <Link
      href={year.href}
      className="pill-arrow inline-flex h-12 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#0B0F0E] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white transition-colors hover:bg-[#0F8472] min-[641px]:h-[52px] min-[641px]:min-w-[min(100%,360px)] min-[641px]:gap-1.5 min-[641px]:self-center min-[641px]:px-7 min-[641px]:text-[15px]"
    >
      {member.name}の調研費を詳しく
      <Chevron />
    </Link>
  );
}

/** 「準備中」の議員の、金額と収支の流れの代わりに出す点線の枠と、押せない「詳しく（準備中）」ボタン */
function ComingSoonBody({
  member,
  layout,
}: {
  member: HomeResearchFundComingSoonMember;
  layout: "pc" | "sp";
}) {
  return (
    <>
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-[#D1D5DB] px-5 text-center ${
          layout === "pc" ? "min-h-[clamp(320px,34vw,420px)] py-10" : "min-h-[220px] py-8"
        }`}
      >
        <p className="m-0 text-[clamp(16px,1.6vw,20px)] font-black leading-[1.5] text-[#0B0F0E]">
          調研費のデータは公開準備中です
        </p>
        <p className="m-0 text-[14px] leading-[1.6] text-[#4B5563]">
          準備ができしだい、収支の流れを公開します
        </p>
        {member.note && (
          <p className="m-0 mt-1 text-[13px] font-medium leading-[1.7] text-[#1F2937]">
            {member.note}
          </p>
        )}
      </div>
      {/* 議員ページはまだ開けないので、押せないボタンにする */}
      <button
        type="button"
        disabled
        className="inline-flex h-12 cursor-not-allowed border-0 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#5F6664] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white min-[641px]:h-[52px] min-[641px]:min-w-[min(100%,360px)] min-[641px]:gap-1.5 min-[641px]:self-center min-[641px]:px-7 min-[641px]:text-[15px]"
      >
        {member.name}の調研費を詳しく（準備中）
        <Chevron />
      </button>
    </>
  );
}

/** 「準備中」の議員を選んだときの PC の右のカード（v9 と同じ見出しの並びで、題名はリンクにしない） */
function ComingSoonPcDetail({ member }: { member: HomeResearchFundComingSoonMember }) {
  return (
    <>
      <div className="flex items-center gap-4">
        <PoliticianAvatar
          photoUrl={member.photoUrl}
          alt={`${member.name}の写真`}
          className="h-[72px] w-[72px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
        />
        <div className="flex min-w-0 flex-[0_1_auto] flex-col items-start gap-1">
          <h3 className="m-0 break-keep text-[clamp(22px,2.6vw,32px)] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere]">
            {member.name}の調研費
          </h3>
          <ComingSoonPill className="px-2.5 py-1 text-[13px]" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <ComingSoonBody member={member} layout="pc" />
      </div>
    </>
  );
}

/**
 * トップページの所属議員の切り替えと、選んだ議員の調研費（v9）。カードに金額は出さない。
 * PC（641px〜）は左右分割にし、左の名簿で選んだ議員の調研費を右の白いカードに出す。
 * SP はカードを縦に重ねたウォレットにし、タップしたカードを開いてその議員の調研費を出す（開いたカードをもう一度タップすると閉じる）。
 * SP は複数枚を同時に開けて、開いたカードそれぞれにその議員の調研費を出す。
 * 2年分以上を公開している議員には年の切り替え（PC は見出しの行の右端、SP は開いたカードの左下）を出し、その場で中身を切り替える。
 * 1年分だけの議員には切り替えを出さない（SP の開いたカードには年を押せないラベルで出す）。
 */
export default function HomeResearchFundMembers({ members, comingSoon = [], defaultYear }: Props) {
  const [selectedSlug, setSelectedSlug] = useState(members[0].slug);
  // PC で議員を切り替えたら、図を見比べやすいよう描き出しの動きなしで出す（初めて画面に入ったときだけ描き出す）
  const [pcSwitched, setPcSwitched] = useState(false);
  // SP は複数枚を同時に開ける。最初は先頭の議員を開いておく
  const [spOpen, setSpOpen] = useState<string[]>(() => [members[0].slug]);
  // 閉じる動きの途中で、まだシートを描いている議員
  const [spClosing, setSpClosing] = useState<string[]>([]);
  // 議員ごとに選んでいる年（未選択なら defaultYear）。PC と SP で共有する
  const [yearBySlug, setYearBySlug] = useState<Record<string, number>>({});
  const selected = members.find((member) => member.slug === selectedSlug) ?? members[0];
  // 「準備中」の議員を選んでいるときは、右のカードに金額と図の代わりに準備中の枠を出す
  const selectedComingSoon = comingSoon.find((member) => member.slug === selectedSlug) ?? null;
  const currentYearOf = (member: HomeResearchFundMember) =>
    yearOf(member, yearBySlug[member.slug] ?? defaultYear);
  const selectYear = (slug: string, year: number) =>
    setYearBySlug((current) => ({ ...current, [slug]: year }));
  const selectedYear = currentYearOf(selected);
  const selectedYearOptions = yearOptionsOf(selected);
  const idPrefix = useId();
  const pcDetailId = `${idPrefix}-detail`;
  const spDetailId = (slug: string) => `${idPrefix}-sp-${slug}`;
  // 議員を切り替えても合計・公費から支給の位置が動かないよう、全議員の図を測って一番高い図に合わせる
  const allSankeys = useMemo(
    () =>
      members.flatMap((member) =>
        member.years.flatMap((year) => [year.sankey.detailed, year.sankey.legal]),
      ),
    [members],
  );

  // SP の開閉は高さ・余白を前後の状態のあいだでなめらかにつなぎ、押したカードは指の下から動かさない
  const spListRef = useRef<HTMLUListElement>(null);
  const walletMorph = useWalletMorph(spListRef);
  const runWalletMorph = walletMorph.run;
  useLayoutEffect(() => {
    runWalletMorph();
  }, [spOpen, runWalletMorph]);

  const toggleOnSp = (slug: string) => {
    const opening = !spOpen.includes(slug);
    const animated = walletMorph.prepare(slug, opening, () =>
      setSpClosing((closing) => closing.filter((item) => item !== slug)),
    );
    setSpOpen((open) => toggleOpen(open, slug));
    if (!opening && animated) setSpClosing((closing) => [...closing, slug]);
  };

  return (
    <>
      {/* PC：左右分割。左の名簿は約2割（最小196px）、残りを右の選んだ議員の調研費に */}
      <div
        data-reveal
        className="hidden grid-cols-[minmax(196px,1fr)_minmax(0,4.2fr)] items-start gap-x-5 min-[641px]:grid"
      >
        <ul
          aria-label="議員を選ぶ"
          className="sticky top-24 z-[2] m-0 flex list-none flex-col gap-0.5 rounded-[24px] bg-white p-2.5 shadow-[0_1px_2px_rgba(11,15,14,0.04)]"
        >
          {members.map((member) => {
            const pressed = !selectedComingSoon && member.slug === selected.slug;
            return (
              <li key={member.slug}>
                {/* 選んだ行は色を付け、右のカードへ小さな矢印でつなぐ */}
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-controls={pcDetailId}
                  aria-label={`${member.name}の調研費を下に表示`}
                  onClick={() => {
                    if (member.slug !== selectedSlug) setPcSwitched(true);
                    setSelectedSlug(member.slug);
                  }}
                  className={`relative flex w-full cursor-pointer items-center gap-2 rounded-[14px] border-0 px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] ${
                    pressed
                      ? "bg-[#E2F6F3] text-[#0B0F0E] after:absolute after:right-[-37px] after:top-1/2 after:z-[3] after:h-3.5 after:w-3.5 after:-translate-y-1/2 after:rotate-45 after:rounded-[2px] after:bg-white after:content-['']"
                      : "bg-transparent text-[#4B5563] hover:bg-[#F1F6F4]"
                  }`}
                >
                  <PoliticianAvatar
                    photoUrl={member.photoUrl}
                    alt={`${member.name}の写真`}
                    className="h-9 w-9"
                  />
                  {/* 列を狭めても名前は切らない */}
                  <span
                    className={`whitespace-nowrap text-[16px] leading-[1.3] ${pressed ? "font-extrabold" : "font-bold"}`}
                  >
                    {member.name}
                  </span>
                </button>
              </li>
            );
          })}
          {/* 「準備中」の議員は公開中の議員の後ろに、名前をグレーにして並べる */}
          {comingSoon.map((member) => {
            const pressed = member.slug === selectedComingSoon?.slug;
            return (
              <li key={member.slug}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-controls={pcDetailId}
                  aria-label={`${member.name}の調研費（準備中）を下に表示`}
                  onClick={() => {
                    if (member.slug !== selectedSlug) setPcSwitched(true);
                    setSelectedSlug(member.slug);
                  }}
                  className={`relative flex w-full cursor-pointer items-center gap-2 rounded-[14px] border-0 px-3 py-2 text-left text-[#9CA3AF] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] ${
                    pressed
                      ? "bg-[#E2F6F3] after:absolute after:right-[-37px] after:top-1/2 after:z-[3] after:h-3.5 after:w-3.5 after:-translate-y-1/2 after:rotate-45 after:rounded-[2px] after:bg-white after:content-['']"
                      : "bg-transparent hover:bg-[#F1F6F4]"
                  }`}
                >
                  <PoliticianAvatar
                    photoUrl={member.photoUrl}
                    alt={`${member.name}の写真`}
                    className="h-9 w-9"
                  />
                  {/* 列が狭いときは「準備中」を名前の下に回し、右のカードへの矢印にかぶせない */}
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap text-[16px] font-bold leading-[1.3]">
                      {member.name}
                    </span>
                    <ComingSoonPill />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section
          id={pcDetailId}
          aria-label={`${(selectedComingSoon ?? selected).name}の調研費`}
          aria-live="polite"
          className="flex min-w-0 flex-col gap-6 rounded-[32px] bg-white p-[clamp(24px,3.6vw,48px)] shadow-[0_1px_2px_rgba(11,15,14,0.04)]"
        >
          {selectedComingSoon ? (
            <ComingSoonPcDetail member={selectedComingSoon} />
          ) : (
            <>
              {/* 題名にホバーしたときも、横の矢印を右へ動かして緑にする（v9 の .mt-msel-hd a.t-go:hover ~ .hd-go） */}
              <div className="group/hd flex items-center gap-4">
                <PoliticianAvatar
                  photoUrl={selected.photoUrl}
                  alt={`${selected.name}の写真`}
                  className="h-[72px] w-[72px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                />
                <div className="flex min-w-0 flex-[0_1_auto] flex-col gap-1">
                  <h3 className="m-0 break-keep text-[clamp(22px,2.6vw,32px)] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere]">
                    <Link
                      href={selectedYear.href}
                      className="text-inherit hover:underline hover:underline-offset-[3px]"
                    >
                      {selected.name}の調研費
                    </Link>
                  </h3>
                  {selectedYear.periodLabel && (
                    <span className="text-[14px] font-bold text-[#238778]">
                      {selectedYear.periodLabel}
                    </span>
                  )}
                </div>
                <Link
                  href={selectedYear.href}
                  aria-label={`${selected.name}の調研費を詳しく見る`}
                  className="relative -ml-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#0B0F0E] transition-[color,translate] duration-300 ease-[cubic-bezier(.2,.7,.1,1)] after:absolute after:-inset-3 after:content-[''] hover:text-[#0F8472] group-has-[h3_a:hover]/hd:text-[#0F8472] motion-safe:hover:translate-x-[3px] motion-safe:group-has-[h3_a:hover]/hd:translate-x-[3px]"
                >
                  <Chevron size={18} />
                </Link>
                {/* 2年分以上を公開している議員だけ、行の右端に年の切り替えを出す（v9 の .mt-msel-yr） */}
                {selectedYearOptions && (
                  <div className="ml-auto flex-shrink-0 self-start">
                    <YearSegment
                      years={selectedYearOptions}
                      currentYear={selectedYear.year}
                      onSelect={(year) => {
                        if (year !== selectedYear.year) setPcSwitched(true);
                        selectYear(selected.slug, year);
                      }}
                      tone="plain"
                    />
                  </div>
                )}
              </div>

              <div className="@container flex flex-col gap-6">
                <MemberAmountsAndFlow
                  member={selected}
                  year={selectedYear}
                  layout="pc"
                  others={allSankeys}
                  drawIn={!pcSwitched}
                />
                <ReturnNote className="-mt-2" />
                {/* 更新日はカードの右下。PC（1101px〜）は「詳しく」ボタンと同じ行の右端に重ねる */}
                {selectedYear.updatedAt && (
                  <div className="flex justify-end min-[1101px]:@min-[720px]:pointer-events-none min-[1101px]:@min-[720px]:-mb-[76px] min-[1101px]:@min-[720px]:h-[52px] min-[1101px]:@min-[720px]:items-center">
                    <span className="whitespace-nowrap text-[12px] font-medium leading-none text-[#5B6470] tabular-nums">
                      {selectedYear.updatedAt}
                    </span>
                  </div>
                )}
                <MemberDetailButton member={selected} year={selectedYear} />
              </div>
            </>
          )}
        </section>
      </div>

      {/* SP：カードを縦に重ねたウォレット。タップしたカードを開き、その下にその議員の調研費を出す（複数枚を同時に開ける） */}
      <ul
        ref={spListRef}
        data-reveal
        aria-label="議員を選ぶ"
        className="m-0 flex list-none flex-col p-0 pb-1 pt-1.5 min-[641px]:hidden"
      >
        {members.map((member, index) => {
          const open = spOpen.includes(member.slug);
          const closing = !open && spClosing.includes(member.slug);
          const afterOpen = index > 0 && spOpen.includes(members[index - 1].slug);
          const isLast = index === members.length - 1 && comingSoon.length === 0;
          const year = currentYearOf(member);
          const yearOptions = yearOptionsOf(member);
          return (
            <li key={member.slug} className="flex flex-col">
              {/* 畳んだカードは束に重ね、開いたカードの次のカードは白いパネルの下に 18px あけて置く。
                  幅は開いても変わらない（政党・政治団体の見出しの面と同じ幅） */}
              <div
                data-wallet-card={member.slug}
                data-on={open}
                className={`mist-surface mist-member-${index % 4} mist-wallet-card relative z-[2] flex w-[calc((100%-40px)*1.071*1.04)] items-start gap-3 self-center text-[#0A1A17] ${
                  afterOpen ? "mt-[18px]" : index > 0 ? "-mt-[30px]" : ""
                } ${
                  open
                    ? "aspect-[1.9825] rounded-[20px] py-[18px] pl-[18px] pr-[66px]"
                    : `${isLast ? "min-h-[62px]" : "min-h-[92px]"} rounded-[18px] px-4 pt-3.5`
                }`}
              >
                {/* カード全体を覆う開閉ボタン（「詳しく見る」と年のラベルはこの上に重ね、ボタンの入れ子にしない） */}
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={spDetailId(member.slug)}
                  aria-label={`${member.name}の調研費`}
                  onClick={() => toggleOnSp(member.slug)}
                  className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#0A1A17]"
                />
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
                  {open && (
                    <span className="truncate text-[12px] font-bold leading-[1.4] tracking-[0.08em] text-[#0A1A17]/80">
                      調研費・{year.periodLabel ?? "準備中"}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute flex items-center justify-center rounded-full bg-white/50 text-[#0A1A17] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_6px_-2px_rgba(10,60,52,0.25)] backdrop-blur-[10px] ${
                    open
                      ? "right-4 top-[21px] h-[38px] w-[38px]"
                      : "right-3.5 top-3.5 h-[34px] w-[34px]"
                  }`}
                >
                  <Chevron
                    size={open ? 20 : 14}
                    className={`transition-transform duration-[450ms] ${open ? "-rotate-90" : "rotate-90"}`}
                  />
                </span>
                {open && (
                  <>
                    {/* 2年分以上なら年の切り替え、1年分だけなら押せる切り替えと見分けられるよう枠のない文字だけのラベルにする。
                        どちらも開閉ボタンより上に重ね、押してもカードを閉じない */}
                    {yearOptions ? (
                      <span className="absolute bottom-3.5 left-4 z-[2] flex">
                        <YearSegment
                          years={yearOptions}
                          currentYear={year.year}
                          onSelect={(picked) => selectYear(member.slug, picked)}
                        />
                      </span>
                    ) : (
                      <span className="absolute bottom-3.5 left-5 z-[2] flex h-10 cursor-default items-center text-[14px] font-bold leading-none tabular-nums text-[#0A1A17]/80">
                        {year.year}年
                      </span>
                    )}
                    {/* 政党・政治団体のカードと同じ「詳しく見る」（.more-link は position: relative なので、置く位置は外の枠で決める） */}
                    <span className="absolute bottom-2.5 right-8 z-[2] flex">
                      <Link
                        href={year.href}
                        aria-label={`${member.name}の調研費を詳しく見る`}
                        className="more-link"
                      >
                        詳しく見る
                      </Link>
                    </span>
                  </>
                )}
              </div>
              {(open || closing) && (
                // 開いたカードを白いパネルの上端から 18px はみ出させ、カードの下から金額まで 26px あける（政党・政治団体のカードと同じ重なり）。
                // 閉じる動きの途中のシートは読み上げ・操作の対象から外す
                <div
                  id={spDetailId(member.slug)}
                  data-wallet-sheet={member.slug}
                  aria-hidden={closing || undefined}
                  inert={closing || undefined}
                  className={`${open ? "wallet-sheet-in " : ""}relative z-[1] mt-[calc(18px_-_(100%_-_40px)_*_1.071_*_1.04_/_1.9825)] flex flex-col gap-[22px] rounded-[24px] bg-white px-4 pb-5 pt-[calc((100%_-_40px)_*_1.071_*_1.04_/_1.9825_+_8px)] shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)]`}
                >
                  <MemberAmountsAndFlow
                    member={member}
                    year={year}
                    layout="sp"
                    others={allSankeys}
                  />
                  <ReturnNote className="-mt-1.5" />
                  {/* 更新日はカードの外（サンキー図の右下） */}
                  {year.updatedAt && (
                    <span className="-mt-1.5 self-end text-[12px] font-bold leading-none text-[#4B5563] tabular-nums">
                      {year.updatedAt}
                    </span>
                  )}
                  <MemberDetailButton member={member} year={year} />
                </div>
              )}
            </li>
          );
        })}
        {/* 「準備中」の議員は公開中の議員の後ろに重ねる。開くと金額と図の代わりに準備中の枠を出す */}
        {comingSoon.map((member, comingSoonIndex) => {
          const index = members.length + comingSoonIndex;
          const open = spOpen.includes(member.slug);
          const closing = !open && spClosing.includes(member.slug);
          const previousSlug =
            comingSoonIndex === 0
              ? members[members.length - 1].slug
              : comingSoon[comingSoonIndex - 1].slug;
          const afterOpen = spOpen.includes(previousSlug);
          const isLast = comingSoonIndex === comingSoon.length - 1;
          return (
            <li key={member.slug} className="flex flex-col">
              <div
                data-wallet-card={member.slug}
                data-on={open}
                className={`mist-surface mist-member-${index % 4} mist-wallet-card relative z-[2] flex w-[calc((100%-40px)*1.071*1.04)] items-start gap-3 self-center text-[#0A1A17] ${
                  afterOpen ? "mt-[18px]" : "-mt-[30px]"
                } ${
                  open
                    ? "aspect-[1.9825] rounded-[20px] py-[18px] pl-[18px] pr-[66px]"
                    : `${isLast ? "min-h-[62px]" : "min-h-[92px]"} rounded-[18px] px-4 pt-3.5`
                }`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={spDetailId(member.slug)}
                  aria-label={`${member.name}の調研費（準備中）`}
                  onClick={() => toggleOnSp(member.slug)}
                  className="absolute inset-0 z-[1] cursor-pointer rounded-[inherit] border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#0A1A17]"
                />
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
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`truncate font-extrabold leading-none tracking-[0.04em] text-[#0A1A17]/60 ${open ? "text-[20px]" : "text-[16px]"}`}
                    >
                      {member.name}
                    </span>
                    <ComingSoonPill className="bg-white/70" />
                  </span>
                  {open && (
                    <span className="truncate text-[12px] font-bold leading-[1.4] tracking-[0.08em] text-[#0A1A17]/80">
                      調研費・準備中
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute flex items-center justify-center rounded-full bg-white/50 text-[#0A1A17] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.55),0_2px_6px_-2px_rgba(10,60,52,0.25)] backdrop-blur-[10px] ${
                    open
                      ? "right-4 top-[21px] h-[38px] w-[38px]"
                      : "right-3.5 top-3.5 h-[34px] w-[34px]"
                  }`}
                >
                  <Chevron
                    size={open ? 20 : 14}
                    className={`transition-transform duration-[450ms] ${open ? "-rotate-90" : "rotate-90"}`}
                  />
                </span>
              </div>
              {(open || closing) && (
                <div
                  id={spDetailId(member.slug)}
                  data-wallet-sheet={member.slug}
                  aria-hidden={closing || undefined}
                  inert={closing || undefined}
                  className={`${open ? "wallet-sheet-in " : ""}relative z-[1] mt-[calc(18px_-_(100%_-_40px)_*_1.071_*_1.04_/_1.9825)] flex flex-col gap-[22px] rounded-[24px] bg-white px-4 pb-5 pt-[calc((100%_-_40px)_*_1.071_*_1.04_/_1.9825_+_8px)] shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)]`}
                >
                  <ComingSoonBody member={member} layout="sp" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
