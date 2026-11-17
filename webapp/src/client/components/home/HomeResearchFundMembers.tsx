"use client";
import "client-only";
import Link from "next/link";
import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import AmountSummary from "@/client/components/common/AmountSummary";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { useWalletMorph } from "@/client/lib/use-wallet-morph";
import { toggleOpen } from "@/client/lib/wallet-deck";
import type { SankeyData } from "@/types/sankey";

export interface HomeResearchFundMember {
  slug: string;
  name: string;
  /** 顔写真の URL。未登録なら null（人型のアイコンにする） */
  photoUrl: string | null;
  /** その議員の調研費ページ */
  href: string;
  /** 例: 「2026.10.23 更新」。未設定なら空文字 */
  updatedAt: string;
  /** 例: 「2026年2-8月分」 */
  periodLabel: string | null;
  kpi: { granted: number; spent: number };
  sankey: { detailed: SankeyData; legal: SankeyData };
}

interface Props {
  /** 調研費を公開中の議員（表示順）。1人以上 */
  members: HomeResearchFundMember[];
  financialYear: number;
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

/**
 * 選んだ議員の金額と収支の流れ（区分タブつき）。others はほかの議員の図（切り替えても合計の柱を動かさないために測る）。
 * SP の開いたカードでは、支給総額と支出総額を横に並べる（ラベルの下に金額）
 */
function MemberAmountsAndFlow({
  member,
  layout,
  others,
  drawIn = true,
}: {
  member: HomeResearchFundMember;
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

/** その議員のページへの黒いボタン */
function MemberDetailButton({ member }: { member: HomeResearchFundMember }) {
  return (
    <Link
      href={member.href}
      className="inline-flex h-12 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#0B0F0E] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white transition-colors hover:bg-[#0F8472] min-[641px]:h-[52px] min-[641px]:min-w-[min(100%,360px)] min-[641px]:gap-1.5 min-[641px]:self-center min-[641px]:px-7 min-[641px]:text-[15px]"
    >
      {member.name}の調研費を詳しく
      <Chevron />
    </Link>
  );
}

/**
 * トップページの所属議員の切り替えと、選んだ議員の調研費（v9）。カードに金額は出さない。
 * PC（641px〜）は左右分割にし、左の名簿で選んだ議員の調研費を右の白いカードに出す。
 * SP はカードを縦に重ねたウォレットにし、タップしたカードを開いてその議員の調研費を出す（開いたカードをもう一度タップすると閉じる）。
 * SP は複数枚を同時に開けて、開いたカードそれぞれにその議員の調研費を出す。
 * 調研費を公開している年は1つだけなので、年の切り替えは出さない（SP の開いたカードには年を押せないラベルで出す）。
 */
export default function HomeResearchFundMembers({ members, financialYear }: Props) {
  const [selectedSlug, setSelectedSlug] = useState(members[0].slug);
  // PC で議員を切り替えたら、図を見比べやすいよう描き出しの動きなしで出す（初めて画面に入ったときだけ描き出す）
  const [pcSwitched, setPcSwitched] = useState(false);
  // SP は複数枚を同時に開ける。最初は先頭の議員を開いておく
  const [spOpen, setSpOpen] = useState<string[]>(() => [members[0].slug]);
  // 閉じる動きの途中で、まだシートを描いている議員
  const [spClosing, setSpClosing] = useState<string[]>([]);
  const selected = members.find((member) => member.slug === selectedSlug) ?? members[0];
  const idPrefix = useId();
  const pcDetailId = `${idPrefix}-detail`;
  const spDetailId = (slug: string) => `${idPrefix}-sp-${slug}`;
  // 議員を切り替えても合計・公費から支給の位置が動かないよう、全議員の図を測って一番高い図に合わせる
  const allSankeys = useMemo(
    () => members.flatMap((member) => [member.sankey.detailed, member.sankey.legal]),
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
      <div className="hidden grid-cols-[minmax(196px,1fr)_minmax(0,4.2fr)] items-start gap-x-5 min-[641px]:grid">
        <ul
          aria-label="議員を選ぶ"
          className="sticky top-24 z-[2] m-0 flex list-none flex-col gap-0.5 rounded-[24px] bg-white p-2.5 shadow-[0_1px_2px_rgba(11,15,14,0.04)]"
        >
          {members.map((member) => {
            const pressed = member.slug === selected.slug;
            return (
              <li key={member.slug}>
                {/* 選んだ行は色を付け、右のカードへ小さな矢印でつなぐ */}
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-controls={pcDetailId}
                  aria-label={`${member.name}の調研費を下に表示`}
                  onClick={() => {
                    if (member.slug !== selected.slug) setPcSwitched(true);
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
        </ul>

        <section
          id={pcDetailId}
          aria-label={`${selected.name}の調研費`}
          aria-live="polite"
          className="flex min-w-0 flex-col gap-6 rounded-[32px] bg-white p-[clamp(24px,3.6vw,48px)] shadow-[0_1px_2px_rgba(11,15,14,0.04)]"
        >
          <div className="flex items-center gap-4">
            <PoliticianAvatar
              photoUrl={selected.photoUrl}
              alt={`${selected.name}の写真`}
              className="h-[72px] w-[72px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
            />
            <div className="flex min-w-0 flex-[0_1_auto] flex-col gap-1">
              <h3 className="m-0 break-keep text-[clamp(22px,2.6vw,32px)] font-black leading-[1.3] tracking-[0.01em] [overflow-wrap:anywhere]">
                <Link
                  href={selected.href}
                  className="text-inherit hover:underline hover:underline-offset-[3px]"
                >
                  {selected.name}の調研費
                </Link>
              </h3>
              {selected.periodLabel && (
                <span className="text-[14px] font-bold text-[#238778]">{selected.periodLabel}</span>
              )}
            </div>
            <Link
              href={selected.href}
              aria-label={`${selected.name}の調研費を詳しく見る`}
              className="relative -ml-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[#0B0F0E] transition-[color,transform] after:absolute after:-inset-3 after:content-[''] hover:translate-x-[3px] hover:text-[#0F8472]"
            >
              <Chevron size={18} />
            </Link>
          </div>

          <div className="@container flex flex-col gap-6">
            <MemberAmountsAndFlow
              member={selected}
              layout="pc"
              others={allSankeys}
              drawIn={!pcSwitched}
            />
            <ReturnNote className="-mt-2" />
            {/* 更新日はカードの右下。PC（1101px〜）は「詳しく」ボタンと同じ行の右端に重ねる */}
            {selected.updatedAt && (
              <div className="flex justify-end min-[1101px]:@min-[720px]:pointer-events-none min-[1101px]:@min-[720px]:-mb-[76px] min-[1101px]:@min-[720px]:h-[52px] min-[1101px]:@min-[720px]:items-center">
                <span className="whitespace-nowrap text-[12px] font-medium leading-none text-[#5B6470] tabular-nums">
                  {selected.updatedAt}
                </span>
              </div>
            )}
            <MemberDetailButton member={selected} />
          </div>
        </section>
      </div>

      {/* SP：カードを縦に重ねたウォレット。タップしたカードを開き、その下にその議員の調研費を出す（複数枚を同時に開ける） */}
      <ul
        ref={spListRef}
        aria-label="議員を選ぶ"
        className="m-0 flex list-none flex-col p-0 pb-1 pt-1.5 min-[641px]:hidden"
      >
        {members.map((member, index) => {
          const open = spOpen.includes(member.slug);
          const closing = !open && spClosing.includes(member.slug);
          const afterOpen = index > 0 && spOpen.includes(members[index - 1].slug);
          const isLast = index === members.length - 1;
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
                    : `${isLast ? "min-h-[62px]" : "min-h-[92px]"} rounded-[18px] px-4 pt-3.5 active:translate-y-0.5`
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
                      調研費・{member.periodLabel ?? "準備中"}
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
                    {/* 年は1つだけなので、押せる切り替えと見分けられるよう枠のない文字だけのラベルにする。
                        開閉ボタンより上に重ね、押してもカードを閉じない */}
                    <span className="absolute bottom-3.5 left-5 z-[2] flex h-10 cursor-default items-center text-[14px] font-bold leading-none tabular-nums text-[#0A1A17]/80">
                      {financialYear}年
                    </span>
                    <Link
                      href={member.href}
                      aria-label={`${member.name}の調研費を詳しく見る`}
                      className="absolute bottom-2.5 right-8 z-[2] inline-flex items-center pb-[13px] pt-3 text-[14px] font-extrabold leading-[1.3] text-[#0A1A17] no-underline transition-colors before:absolute before:bottom-2 before:right-[-14px] before:h-[1.5px] before:w-[9px] before:origin-right before:rotate-[38deg] before:rounded-[1px] before:bg-current before:content-[''] after:absolute after:bottom-2 after:left-0 after:right-[-14px] after:h-[1.5px] after:rounded-[1px] after:bg-current after:content-[''] hover:text-[#0F8472] focus-visible:text-[#0F8472] active:text-[#0F8472]"
                    >
                      詳しく見る
                    </Link>
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
                  className="relative z-[1] mt-[calc(18px_-_(100%_-_40px)_*_1.071_*_1.04_/_1.9825)] flex flex-col gap-[22px] rounded-[24px] bg-white px-4 pb-5 pt-[calc((100%_-_40px)_*_1.071_*_1.04_/_1.9825_+_8px)] shadow-[0_0_0_1px_#DCE4E1,0_30px_50px_-34px_rgba(10,60,52,0.35)]"
                >
                  <MemberAmountsAndFlow member={member} layout="sp" others={allSankeys} />
                  <ReturnNote className="-mt-1.5" />
                  {/* 更新日はカードの外（サンキー図の右下） */}
                  {member.updatedAt && (
                    <span className="-mt-1.5 self-end text-[12px] font-bold leading-none text-[#4B5563] tabular-nums">
                      {member.updatedAt}
                    </span>
                  )}
                  <MemberDetailButton member={member} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
