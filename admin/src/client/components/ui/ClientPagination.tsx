"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/client/components/ui";

interface ClientPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** 「前へ / 次へ」ピルを StaticPagination と同じ寸法（px-4 / py-7px / 12px 文字）に揃える */
const pillButtonClass = "h-auto gap-1.5 px-4 py-[7px] text-xs has-[>svg]:px-4";

/**
 * クライアント側の状態でページを切り替えるページネーション。
 * 見た目は `StaticPagination` に揃える（「前へ / 次へ」の黒枠白ピルと、中央に Poppins の「現在 / 総数」表示）。
 */
export function ClientPagination({ currentPage, totalPages, onPageChange }: ClientPaginationProps) {
  if (totalPages <= 0) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="pagination" className="mt-6 flex items-center justify-center gap-2.5">
      <Button
        type="button"
        variant="outline"
        className={pillButtonClass}
        disabled={!hasPrev}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <CaretLeft className="size-3" />
        前へ
      </Button>

      <span className="font-latin text-[13px] font-semibold text-foreground">
        {currentPage} / {totalPages}
      </span>

      <Button
        type="button"
        variant="outline"
        className={pillButtonClass}
        disabled={!hasNext}
        onClick={() => onPageChange(currentPage + 1)}
      >
        次へ
        <CaretRight className="size-3" />
      </Button>
    </nav>
  );
}
