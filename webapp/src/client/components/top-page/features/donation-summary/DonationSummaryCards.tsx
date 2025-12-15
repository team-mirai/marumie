"use client";
import "client-only";
import Image from "next/image";
import BaseCard from "@/client/components/ui/BaseCard";

interface DonationSummaryCardsProps {
  totalOku: number;
  totalMan: number;
  totalEn: number;
  dayOverDayChange: number;
}

export default function DonationSummaryCards({
  totalOku,
  totalMan,
  totalEn,
  dayOverDayChange,
}: DonationSummaryCardsProps) {
  return (
    <>
      {/* SP レイアウト - 2つのカードが縦に並ぶ */}
      <div className="flex md:hidden flex-col gap-2">
        {/* 寄付金額カード */}
        <BaseCard className="!p-4">
          <div className="flex flex-row justify-between items-center gap-3">
            <div className="flex flex-col justify-center">
              <div className="text-[#4B5563] font-bold text-sm">寄付金額</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-baseline gap-[2px]">
                {totalOku > 0 && (
                  <>
                    <span className="font-bold text-2xl leading-5 text-gray-800">{totalOku}</span>
                    <span className="font-bold text-xs text-[#6B7280]">億</span>
                  </>
                )}
                {totalMan > 0 && (
                  <>
                    <span className="font-bold text-2xl leading-5 text-gray-800">{totalMan}</span>
                    <span className="font-bold text-xs text-[#6B7280]">万</span>
                  </>
                )}
                <span className="font-bold text-2xl leading-5 text-gray-800">{totalEn}</span>
                <span className="font-bold text-xs text-[#6B7280]">円</span>
              </div>
              <div className="flex items-center gap-[2px] h-4">
                <span className="text-[#238778] font-normal text-[11px] leading-3">前日比</span>
                <div className="flex items-center">
                  <span className="font-bold text-[#238778] text-[13px] leading-[13px]">
                    {dayOverDayChange.toLocaleString()}円
                  </span>
                  <Image
                    src="/icons/icon-arrow-up.svg"
                    alt="上向き矢印"
                    width={13}
                    height={13}
                    className="flex-shrink-0 ml-[2px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        {/* 企業団体献金カード */}
        <BaseCard className="!p-4 h-[76px]">
          <div className="flex flex-row justify-between items-center gap-3 h-full">
            <div className="flex flex-col justify-center">
              <div className="text-[#4B5563] font-bold text-sm">うち企業団体献金</div>
            </div>
            <div className="flex items-end">
              <div className="flex items-baseline gap-[2px]">
                <span className="font-bold text-2xl leading-5 text-gray-800">0</span>
                <span className="font-bold text-xs text-[#6B7280]">円</span>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      {/* PC レイアウト - 2つのカードが横に並ぶ */}
      <div className="hidden md:flex gap-6">
        {/* 寄付金額カード */}
        <BaseCard className="flex-1">
          <div className="flex flex-col justify-center gap-4">
            <div className="flex flex-row justify-between items-start">
              <div className="flex flex-col justify-center gap-6">
                <div className="text-gray-800 font-bold text-base">寄付金額</div>
              </div>
              <div className="flex items-center gap-[2px]">
                <span className="text-[#238778] font-bold text-[13px] leading-[17px]">前日比</span>
                <Image
                  src="/icons/icon-arrow-up.svg"
                  alt="上向き矢印"
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <span className="font-bold text-[#238778] text-[16px] leading-[16px]">
                  {dayOverDayChange.toLocaleString()}
                </span>
                <span className="text-[#238778] font-bold text-[13px] leading-[17px]">円</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              {totalOku > 0 && (
                <>
                  <span className="font-bold text-[36px] leading-[30px] text-gray-800">
                    {totalOku}
                  </span>
                  <span className="font-bold text-base leading-[16px] text-gray-800">億</span>
                </>
              )}
              {totalMan > 0 && (
                <>
                  <span className="font-bold text-[36px] leading-[30px] text-gray-800">
                    {totalMan}
                  </span>
                  <span className="font-bold text-base leading-[16px] text-gray-800">万</span>
                </>
              )}
              <span className="font-bold text-[36px] leading-[30px] text-gray-800">{totalEn}</span>
              <span className="font-bold text-base leading-[16px] text-gray-800">円</span>
            </div>
          </div>
        </BaseCard>

        {/* 企業団体献金カード */}
        <BaseCard className="w-full md:w-[364px] h-[115px]">
          <div className="flex flex-col justify-center gap-4 h-full">
            <div className="text-gray-800 font-bold text-base">うち企業団体献金</div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[36px] leading-[30px] text-gray-800">0</span>
              <span className="font-bold text-base leading-[16px] text-gray-800">円</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </>
  );
}
