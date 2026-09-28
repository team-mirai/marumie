"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ResearchFundFlowChart from "@/client/components/research-fund/ResearchFundFlowChart";
import ResearchFundKpiCard from "@/client/components/research-fund/ResearchFundKpiCard";
import type { ResearchFundPartyPoliticianView } from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";

interface Props {
  politicians: ResearchFundPartyPoliticianView[];
  financialYear: number;
}

const CHIP_CLASS =
  "inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold transition-all duration-150";

/**
 * 調研費サマリーの本体。議員チップで選んだ議員の見出し・KPI・サンキーを出す。
 *
 * 公開中の議員が1名だけの間は、その議員の塗りチップと「他議員も今後追加」の破線チップだけを並べる
 * （準備中の議員はチップにしない）。2名以上になったら全議員をチップにして選択を切り替える。
 * 初期選択は公開中の先頭の議員。誰も公開していなければ先頭の議員。
 */
export default function ResearchFundPartyBody({ politicians, financialYear }: Props) {
  const readyPoliticians = politicians.filter((item) => item.ready);
  const solo = readyPoliticians.length === 1;
  const initialSlug = (readyPoliticians[0] ?? politicians[0])?.slug ?? "";
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);

  const selected = politicians.find((item) => item.slug === selectedSlug) ?? politicians[0];
  if (!selected) return null;

  return (
    <>
      {solo ? (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <span className={`${CHIP_CLASS} border border-[#238778] bg-[#238778] text-white`}>
            {selected.name}
          </span>
          <span
            className={`${CHIP_CLASS} border border-dashed border-[#D1D5DB] bg-white text-[#9CA3AF]`}
          >
            他議員も今後追加
          </span>
        </div>
      ) : (
        <div className="-mt-2 flex flex-wrap gap-2">
          {politicians.map((politician) => {
            const isSelected = politician.slug === selected.slug;
            return (
              <button
                key={politician.slug}
                type="button"
                onClick={() => setSelectedSlug(politician.slug)}
                aria-pressed={isSelected}
                className={`${CHIP_CLASS} cursor-pointer border ${
                  isSelected
                    ? "border-[#238778] bg-[#238778] text-white"
                    : politician.ready
                      ? "border-[#1F2937] bg-white text-[#1F2937]"
                      : "border-[#E5E7EB] bg-white text-[#9CA3AF]"
                }`}
              >
                {politician.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="-mt-3 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="inline-flex flex-wrap items-center gap-2.5">
              <span className="text-xl font-bold text-[#1F2937]">{selected.name}</span>
              {selected.ready && (
                <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[#238778] bg-[#E2F6F3] px-2.5 text-[11px] font-bold text-[#238778]">
                  試験公開中
                </span>
              )}
            </span>
            <span className="text-[13px] text-[#6A7383]">{selected.statusLabel}</span>
          </div>
          {selected.ready && (
            <Link
              href={`/p/${encodeURIComponent(selected.slug)}/${financialYear}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[#1F2937] bg-white px-5 text-sm font-bold text-[#1F2937] transition-colors duration-150 hover:bg-[#F9FAFB]"
            >
              {selected.name}の調研費を詳しく
              <Image src="/icons/icon-chevron-right.svg" alt="" width={16} height={16} />
            </Link>
          )}
        </div>

        {selected.ready ? (
          <div className="flex flex-col gap-8">
            {/* KPI は2枚だけ。未使用分はカードにしない（未使用はサンキーの末尾ノードとしてのみ出す） */}
            <div className="flex flex-wrap items-stretch gap-2">
              <ResearchFundKpiCard
                title="支給総額"
                amount={selected.kpi.granted}
                titleColor="#238778"
              />
              <ResearchFundKpiCard
                title="支出総額"
                amount={selected.kpi.spent}
                titleColor="#DC2626"
              />
            </div>

            <div>
              {/* 議員を切り替えてもタブの状態は保つ。調研費ページのタブとは独立 */}
              <ResearchFundFlowChart sankey={selected.sankey} />
              <p className="mt-2 text-xs leading-[1.6] text-[#9CA3AF]">
                支給額の1%未満の費目は「その他」にまとめています。
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D1D5DB] px-6 py-10 text-center text-sm leading-[1.7] text-[#6A7383]">
            {selected.name}の調研費は現在準備中です。
            <br />
            記録シートの整理が完了した月から順次公開します。
          </div>
        )}
      </div>
    </>
  );
}
