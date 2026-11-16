"use client";
import "client-only";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { transactionsCategoryHref } from "@/client/lib/transactions-category-href";
import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";
import { transactionSortParams, type TransactionSort } from "@/client/lib/transaction-sort";
import TransactionTable from "./TransactionTable";
import PCPaginator from "./PCPaginator";
import MobilePaginator from "./MobilePaginator";
import CsvDownloadLink from "@/client/components/transactions/CsvDownloadLink";
import TransactionSortTabs from "@/client/components/transactions/TransactionSortTabs";

interface InteractiveTransactionTableProps {
  slug: string;
  year: number;
  transactions: DisplayTransaction[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  selectedCategories?: string[];
  /** URL で指定された並び順（parseTransactionSort の出力） */
  sort: TransactionSort;
}

export default function InteractiveTransactionTable({
  slug,
  year,
  transactions,
  total,
  page,
  perPage,
  totalPages,
  selectedCategories,
  sort,
}: InteractiveTransactionTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleSortChange = (next: TransactionSort) => {
    const params = new URLSearchParams(searchParams.toString());
    const { sort, order } = transactionSortParams(next);
    params.set("sort", sort);
    params.set("order", order);
    // 以前の「支出が多い順」「収入が多い順」は収入・支出だけに絞り込んでいた。並び順を変えたら絞り込みを外す
    params.delete("filterType");

    // Reset to page 1 when sorting changes
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleApplyFilter = (selectedKeys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedKeys.length > 0) {
      params.set("categories", selectedKeys.join(","));
    } else {
      params.delete("categories");
    }

    // Reset to page 1 when filtering changes
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  // 行のカテゴリーのラベルのリンク先。ボタンではなく通常のリンクにして、
  // 新しいタブで開く・リンクのコピーといったブラウザ標準の操作ができるようにする。
  const categoryHref = (categoryKey: string) =>
    transactionsCategoryHref(pathname, new URLSearchParams(searchParams.toString()), categoryKey);

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, total);

  return (
    <>
      {/* SP の並び替えタブ（640px以下で表示） */}
      <TransactionSortTabs current={sort} onChange={handleSortChange} />

      <TransactionTable
        transactions={transactions}
        allowControl={true}
        sort={sort}
        onSortChange={handleSortChange}
        onApplyFilter={handleApplyFilter}
        selectedCategories={selectedCategories}
        categoryHref={categoryHref}
      />

      {/* ページネーション */}

      {/* PC版レイアウト（641px以上で表示） */}
      <div className="hidden min-[641px]:block py-3.5">
        {/* ページャーとCSVダウンロードリンクのレイアウト */}
        <div className="flex justify-between items-center">
          {/* 左側のスペース（バランス調整用） */}
          <div className="flex-1"></div>

          {/* 中央のページャー */}
          <div className="flex justify-center">
            <PCPaginator
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              maxVisiblePages={7}
            />
          </div>

          {/* 右側のCSVダウンロードリンク */}
          <div className="flex-1 flex justify-end">
            <CsvDownloadLink
              slug={slug}
              year={year}
              className="px-4 py-3 text-sm font-bold text-[#238778] bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            />
          </div>
        </div>
        {/* 件数表示を下に配置 */}
        <div className="text-center text-sm font-medium text-[#6A7383] leading-5 tracking-[0.5%] mt-3">
          {total}件中 {startItem}-{endItem}件を表示
        </div>
      </div>

      {/* モバイル版レイアウト（640px以下で表示） */}
      <div className="min-[641px]:hidden py-3.5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[#6A7383] leading-5 tracking-[0.5%]">
            {total}件中 {startItem}-{endItem}件を表示
          </div>

          <MobilePaginator
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>

        {/* SP版CSVダウンロードリンク */}
        <div className="mt-3 text-right">
          <CsvDownloadLink
            slug={slug}
            year={year}
            className="text-sm font-bold text-[#238778] hover:bg-gray-50 transition-all cursor-pointer"
          />
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500 text-left">
        ※人件費については、各月の人件費が確定した時点で当該月末の金額を表示しています
      </p>
    </>
  );
}
