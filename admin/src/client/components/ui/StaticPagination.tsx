"use client";

import type { ReactNode } from "react";
import Link from "next/link";

interface StaticPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function StaticPagination({ currentPage, totalPages, basePath }: StaticPaginationProps) {
  const generatePageUrl = (page: number) => {
    return `${basePath}?page=${page}`;
  };

  const renderPageNumbers = () => {
    if (totalPages <= 0) return null;

    const pages: ReactNode[] = [];
    const windowSize = 5;

    const addPageLink = (page: number) => {
      pages.push(
        <Link
          key={`page-${page}`}
          href={generatePageUrl(page)}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            page === currentPage
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-secondary hover:text-white"
          }`}
        >
          {page}
        </Link>,
      );
    };

    const addEllipsis = (key: string) => {
      pages.push(
        <span key={`ellipsis-${key}`} className="px-2 text-muted-foreground select-none">
          …
        </span>,
      );
    };

    if (totalPages <= windowSize + 2) {
      for (let page = 1; page <= totalPages; page++) {
        addPageLink(page);
      }
      return pages;
    }

    addPageLink(1);

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
      addPageLink(page);
    }

    if (endPage < totalPages - 1) {
      addEllipsis("right");
    }

    addPageLink(totalPages);

    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {currentPage > 1 && (
        <Link
          href={generatePageUrl(currentPage - 1)}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-white rounded-md transition-colors"
        >
          ← 前
        </Link>
      )}

      {renderPageNumbers()}

      {currentPage < totalPages && (
        <Link
          href={generatePageUrl(currentPage + 1)}
          className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-white rounded-md transition-colors"
        >
          次 →
        </Link>
      )}
    </div>
  );
}
