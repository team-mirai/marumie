"use client";
import "client-only";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { OrganizationsResponse } from "@/types/organization";

const AVAILABLE_YEARS = [2025, 2026] as const;
const DEFAULT_YEAR = 2026;

interface OrganizationYearSheetProps {
  organizations: OrganizationsResponse;
  /** 年度ごとの議員一覧。選択中の年度に帳簿がある議員だけを出す */
  politiciansByYear: Record<number, ResearchFundPoliticianEntry[]>;
  initialSlug?: string;
  /** 議員ページを開いているときの議員 slug。政治団体ページでは undefined */
  initialPoliticianSlug?: string;
  initialYear?: number;
}

export default function OrganizationYearSheet({
  organizations,
  politiciansByYear,
  initialSlug,
  initialPoliticianSlug,
  initialYear,
}: OrganizationYearSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(initialSlug || "");
  const [currentPoliticianSlug, setCurrentPoliticianSlug] = useState(initialPoliticianSlug || "");
  const [currentYear, setCurrentYear] = useState(initialYear || DEFAULT_YEAR);

  useEffect(() => {
    const pathSegments = pathname.split("/");
    // URL format: /o/{slug}/{year}/... または /p/{slug}/{year}
    const isPolitician = pathSegments[1] === "p";
    if ((pathSegments[1] === "o" || isPolitician) && pathSegments[2]) {
      if (isPolitician) {
        setCurrentPoliticianSlug(pathSegments[2]);
      } else {
        setCurrentPoliticianSlug("");
        setCurrentSlug(pathSegments[2]);
      }
      if (pathSegments[3]) {
        const yearFromPath = parseInt(pathSegments[3], 10);
        if (AVAILABLE_YEARS.includes(yearFromPath as (typeof AVAILABLE_YEARS)[number])) {
          setCurrentYear(yearFromPath);
        }
      }
    }
  }, [pathname]);

  const currentOrganization = organizations.organizations.find((org) => org.slug === currentSlug);
  const politicians = politiciansByYear[currentYear] ?? [];
  const currentPolitician = politicians.find(
    (politician) => politician.slug === currentPoliticianSlug,
  );

  const handleSelect = (slug: string, year: number) => {
    const pathSegments = pathname.split("/");

    // Determine the rest of the path after slug/year (e.g., /transactions)
    let restOfPath = "";
    if (pathSegments[1] === "o" && pathSegments[2]) {
      // Check if there's content after the year
      if (pathSegments[4]) {
        restOfPath = `/${pathSegments.slice(4).join("/")}`;
      }
    }

    const newPath = `/o/${slug}/${year}${restOfPath}`;
    router.push(newPath);
  };

  const handleOrganizationSelect = (slug: string) => {
    handleSelect(slug, currentYear);
  };

  const handlePoliticianSelect = (slug: string) => {
    router.push(`/p/${encodeURIComponent(slug)}/${currentYear}`);
  };

  const handleYearSelect = (year: number) => {
    // その年度に帳簿が無い議員ページへ送ると 404 になるので、政治団体ページに戻す。
    const hasBook = (politiciansByYear[year] ?? []).some(
      (politician) => politician.slug === currentPoliticianSlug,
    );
    if (currentPoliticianSlug && hasBook) {
      router.push(`/p/${encodeURIComponent(currentPoliticianSlug)}/${year}`);
      return;
    }
    handleSelect(currentSlug, year);
  };

  const triggerLabel =
    currentPolitician?.name ?? currentOrganization?.displayName ?? "政治団体を選択";

  return (
    <div className="relative w-full min-w-0 max-w-full">
      {/* Trigger Button */}
      <button
        type="button"
        className="flex items-center gap-4 w-full min-w-0 pb-1.5 pl-6 pr-4 pt-2 border-[0.5px] border-black rounded-lg font-bold hover:opacity-90 transition-opacity cursor-pointer"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgb(226, 246, 243) 24%, rgb(238, 246, 226) 76%)",
        }}
        onClick={() => setIsOpen(true)}
      >
        <span className="flex flex-col gap-1.5 items-start flex-1 min-w-0 leading-none">
          <span className="text-[14px] leading-none text-black truncate w-full text-left">
            {triggerLabel}
          </span>
          <span className="text-[9px] leading-none text-[#238778]">{currentYear}年</span>
        </span>
        <Image
          src="/icons/icon-chevron-down.svg"
          alt=""
          width={24}
          height={24}
          className={isOpen ? "rotate-180" : ""}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="閉じる"
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-1 z-50 w-68 bg-white rounded-lg border border-black/50 shadow-lg py-3 max-h-[70vh] overflow-y-auto">
            {/* Organization Selection */}
            <div className="px-4 flex flex-col gap-1">
              <p className="text-[11px] text-[#5a5a5a]">
                政治資金 {organizations.organizations.length}団体
              </p>
              <div className="flex flex-col">
                {organizations.organizations.map((org) => (
                  <button
                    key={org.slug}
                    type="button"
                    onClick={() => handleOrganizationSelect(org.slug)}
                    className="flex items-center gap-2 h-9 pl-6 text-left cursor-pointer rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <span className="w-3 flex items-center justify-center">
                      {!currentPoliticianSlug && currentSlug === org.slug && <SelectedMark />}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-900">{org.displayName}</span>
                      {org.orgName && (
                        <span className="text-[8px] text-[#6a6a6a]">{org.orgName}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Research Fund (Politicians) Selection */}
            {politicians.length > 0 && (
              <>
                <hr className="my-2 border-gray-200" />
                <div className="px-4 flex flex-col gap-1">
                  <p className="text-[11px] text-[#5a5a5a]">
                    調査研究費 議員{politicians.length}人
                  </p>
                  <div className="flex flex-col">
                    {politicians.map((politician) => (
                      <button
                        key={politician.slug}
                        type="button"
                        onClick={() => handlePoliticianSelect(politician.slug)}
                        // 準備中の議員も隠さず、押せる状態のままグレーで並べる（デザイン仕様 §5）
                        className="flex items-center gap-2 min-h-9 py-1 pl-6 text-left cursor-pointer rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <span className="w-3 flex items-center justify-center">
                          {currentPoliticianSlug === politician.slug && <SelectedMark />}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span
                            className={`text-xs ${
                              politician.ready ? "text-gray-900" : "text-[#9CA3AF]"
                            }`}
                          >
                            {politician.name}
                          </span>
                          <span className="text-[8px] text-[#6a6a6a]">
                            {politician.statusLabel}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <hr className="my-2 border-gray-200" />

            {/* Year Selection */}
            <div className="px-4 py-1 flex flex-col gap-2">
              <p className="text-[11px] text-[#5a5a5a]">対象年</p>
              <div className="flex gap-3">
                {AVAILABLE_YEARS.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => handleYearSelect(year)}
                    className={`px-3 py-1.5 rounded-full text-[11px] leading-none transition-all cursor-pointer hover:opacity-70 ${
                      currentYear === year ? "font-bold text-[#238778]" : "bg-[#ececec] text-black"
                    }`}
                    style={
                      currentYear === year
                        ? {
                            background:
                              "linear-gradient(157deg, rgb(226, 246, 243) 24%, rgb(238, 246, 226) 76%)",
                          }
                        : undefined
                    }
                  >
                    {year}年
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <hr className="my-2 border-gray-200" />

            {/* Close */}
            <div className="px-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-[#238778] cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SelectedMark() {
  return (
    <svg
      width="13"
      height="11"
      viewBox="0 0 13 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <title>選択中</title>
      <path
        d="M1 5.5L5 9.5L12 1.5"
        stroke="#238778"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
