"use client";

import type { ReactNode } from "react";
import { Button } from "@/client/components/ui";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ClientPagination({ currentPage, totalPages, onPageChange }: ClientPaginationProps) {
  const renderPageNumbers = () => {
    if (totalPages <= 0) return null;

    const pages: ReactNode[] = [];
    const windowSize = 5;

    const addPageButton = (page: number) => {
      pages.push(
        <Button
          type="button"
          key={`page-${page}`}
          variant={page === currentPage ? "default" : "ghost"}
          size="sm"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>,
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ← 前
        </Button>
      )}

      {renderPageNumbers()}

      {currentPage < totalPages && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
        >
          次 →
        </Button>
      )}
    </div>
  );
}
