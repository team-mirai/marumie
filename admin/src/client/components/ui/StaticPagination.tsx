"use client";

import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/client/lib";

interface StaticPaginationProps {
  currentPage: number;
  totalPages: number;
  /** `${basePath}?page=N` 形式で遷移する。`buildPageUrl` を渡す場合は不要 */
  basePath?: string;
  /** 検索クエリなど他のパラメータを保持したい場合に、ページ番号から URL を組み立てる */
  buildPageUrl?: (page: number) => string;
}

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] bg-card px-4 py-[7px] text-xs font-bold transition-colors duration-150 ease-out";
const enabledClass =
  "border-border text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const disabledClass = "border-disabled-border text-disabled-foreground cursor-not-allowed";

/**
 * URL の `?page=` で遷移する静的ページネーション。
 * 「前へ / 次へ」の黒枠白ピルと、中央に Poppins の「現在 / 総数」表示。
 */
export function StaticPagination({
  currentPage,
  totalPages,
  basePath = "",
  buildPageUrl,
}: StaticPaginationProps) {
  if (totalPages <= 0) return null;

  const generatePageUrl = buildPageUrl ?? ((page: number) => `${basePath}?page=${page}`);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="pagination" className="mt-6 flex items-center justify-center gap-2.5">
      {hasPrev ? (
        <Link href={generatePageUrl(currentPage - 1)} className={cn(pillClass, enabledClass)}>
          <CaretLeft className="size-3" />
          前へ
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(pillClass, disabledClass)}>
          <CaretLeft className="size-3" />
          前へ
        </span>
      )}

      <span className="font-latin text-[13px] font-semibold text-foreground">
        {currentPage} / {totalPages}
      </span>

      {hasNext ? (
        <Link href={generatePageUrl(currentPage + 1)} className={cn(pillClass, enabledClass)}>
          次へ
          <CaretRight className="size-3" />
        </Link>
      ) : (
        <span aria-disabled="true" className={cn(pillClass, disabledClass)}>
          次へ
          <CaretRight className="size-3" />
        </span>
      )}
    </nav>
  );
}
