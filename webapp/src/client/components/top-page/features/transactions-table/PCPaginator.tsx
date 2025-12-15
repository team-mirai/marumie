"use client";
import "client-only";
import Image from "next/image";

interface PCPaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number; // デフォルト7（奇数）
}

export default function PCPaginator({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
}: PCPaginatorProps) {
  // ページ番号の配列を生成する関数
  const generatePageNumbers = (): number[] => {
    if (totalPages <= maxVisiblePages) {
      // 全ページ数が表示可能数以下の場合は全て表示
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisiblePages / 2);

    // 先頭の場合：1から maxVisiblePages まで
    if (currentPage <= halfVisible + 1) {
      return Array.from({ length: maxVisiblePages }, (_, i) => i + 1);
    }

    // 末尾の場合：totalPages - maxVisiblePages + 1 から totalPages まで
    if (currentPage >= totalPages - halfVisible) {
      return Array.from(
        { length: maxVisiblePages },
        (_, i) => totalPages - maxVisiblePages + i + 1,
      );
    }

    // 中央の場合：currentPage を中心とした maxVisiblePages 個
    return Array.from({ length: maxVisiblePages }, (_, i) => currentPage - halfVisible + i);
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex items-center gap-2 px-0.5">
      {/* 前のページボタン */}
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

      {/* ページ番号ボタン */}
      {pageNumbers.map((pageNum) => (
        <button
          key={pageNum}
          type="button"
          onClick={() => onPageChange(pageNum)}
          className={`
            flex items-center justify-center w-8 h-8 border rounded shadow-[0px_1px_1px_0px_rgba(0,0,0,0.08)] transition-colors cursor-pointer
            ${
              pageNum === currentPage
                ? "bg-[#E5E7EB] border-[#E5E7EB] text-[#1F2937] font-medium"
                : "bg-white border-[#6B7280] text-[#6B7280] hover:bg-gray-50 font-medium"
            }
          `}
          aria-label={`ページ ${pageNum}`}
          aria-current={pageNum === currentPage ? "page" : undefined}
        >
          <span className="text-sm leading-none">{pageNum}</span>
        </button>
      ))}

      {/* 次のページボタン */}
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
