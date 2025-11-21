"use client";

import type { ReactNode } from "react";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ClientPagination({
  currentPage,
  totalPages,
  onPageChange,
}: ClientPaginationProps) {
  const renderPageNumbers = () => {
    if (totalPages <= 0) return null;

    const pages: ReactNode[] = [];
    const windowSize = 5;

    const addPageButton = (page: number) => {
      pages.push(
        <button
          type="button"
          key={`page-${page}`}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            page === currentPage
              ? "bg-primary-accent text-white"
              : "text-primary-muted hover:bg-primary-border hover:text-white"
          }`}
        >
          {page}
        </button>,
      );
    };

    const addEllipsis = (key: string) => {
      pages.push(
        <span
          key={`ellipsis-${key}`}
          className="px-2 text-primary-muted select-none"
        >
          …
        </span>,
      );
    };

    if (totalPages <= windowSize + 2) {
      for (let page = 1; page <= totalPages; page++) {
        addPageButton(page);
      }
      return pages;
    }

    addPageButton(1);

    let startPage = Math.max(2, currentPage - Math.floor(windowSize / 2));
    let endPage = Math.min(totalPages - 1, startPage + windowSize - 1);

    if (endPage >= totalPages) {
      endPage = totalPages - 1;
      startPage = endPage - windowSize + 1;
    }

    if (startPage > 2) {
      addEllipsis("left");
    }

    for (let page = startPage; page <= endPage; page++) {
      addPageButton(page);
    }

    if (endPage < totalPages - 1) {
      addEllipsis("right");
    }

    addPageButton(totalPages);

    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {currentPage > 1 && (
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-2 text-sm font-medium text-primary-muted hover:bg-primary-border hover:text-white rounded-md transition-colors cursor-pointer"
        >
          ← 前
        </button>
      )}

      {renderPageNumbers()}

      {currentPage < totalPages && (
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-2 text-sm font-medium text-primary-muted hover:bg-primary-border hover:text-white rounded-md transition-colors cursor-pointer"
        >
          次 →
        </button>
      )}
    </div>
  );
}
