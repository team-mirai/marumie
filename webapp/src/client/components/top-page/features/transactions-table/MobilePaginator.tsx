"use client";
import "client-only";
import Image from "next/image";

interface MobilePaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function MobilePaginator({
  currentPage,
  totalPages,
  onPageChange,
}: MobilePaginatorProps) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 border border-[rgba(60,66,87,0.12)] rounded shadow-[0px_1px_1px_0px_rgba(0,0,0,0.08)] bg-white hover:bg-gray-50 disabled:bg-[#F4F4F5] disabled:cursor-not-allowed cursor-pointer transition-colors"
        aria-label="前のページ"
      >
        <Image
          src="/icons/icon-chevron-down.svg"
          alt="前のページ"
          width={20}
          height={20}
          className={`transform rotate-90 ${currentPage === 1 ? "opacity-30" : "opacity-100"}`}
        />
      </button>

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-8 h-8 border border-[rgba(60,66,87,0.12)] rounded shadow-[0px_1px_1px_0px_rgba(0,0,0,0.08)] bg-white hover:bg-gray-50 disabled:bg-[#F4F4F5] disabled:cursor-not-allowed cursor-pointer transition-colors"
        aria-label="次のページ"
      >
        <Image
          src="/icons/icon-chevron-down.svg"
          alt="次のページ"
          width={20}
          height={20}
          className={`transform -rotate-90 ${
            currentPage === totalPages ? "opacity-30" : "opacity-100"
          }`}
        />
      </button>
    </div>
  );
}
