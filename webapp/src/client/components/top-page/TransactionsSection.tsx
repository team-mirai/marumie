"use client";
import "client-only";
import Link from "next/link";
import { useMemo, useState } from "react";
import SectionCard from "@/client/components/layout/SectionCard";
import TransactionTable from "@/client/components/top-page/features/transactions-table/TransactionTable";
import TransactionSortTabs from "@/client/components/transactions/TransactionSortTabs";
import {
  sortTransactionRows,
  transactionSortParams,
  type TransactionSort,
} from "@/client/lib/transaction-sort";

import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";

interface TransactionData {
  transactions: DisplayTransaction[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface TransactionsSectionProps {
  transactionData: TransactionData | null;
  updatedAt: string;
  slug: string;
  year: number;
  /** 見出しの上の小さな行（例: 「チームみらい・2026年」） */
  eyebrow: string;
}

/**
 * 政党・政治団体ページの「すべての出入金」。最新の数件だけを出し、続きは「もっと見る」から全件ページで見る。
 * SP では表の上のタブで、出している行の並び順を変えられる。全件ページへはその並び順のまま移る。
 */
export default function TransactionsSection({
  transactionData,
  updatedAt,
  slug,
  year,
  eyebrow,
}: TransactionsSectionProps) {
  const [sort, setSort] = useState<TransactionSort>("new");
  const transactions = useMemo(
    () =>
      sortTransactionRows(transactionData?.transactions ?? [], sort, {
        date: (transaction) => new Date(transaction.date).getTime(),
        signedAmount: (transaction) => transaction.amount,
      }),
    [transactionData, sort],
  );
  const { sort: sortParam, order } = transactionSortParams(sort);
  const allHref = `/o/${slug}/${year}/transactions${sort === "new" ? "" : `?sort=${sortParam}&order=${order}`}`;

  return (
    <SectionCard
      id="transactions"
      iconSrc="/icons/icon-cashback.svg"
      iconLabel="Cash move icon"
      eyebrow={eyebrow}
      title="すべての出入金"
      updatedAt={updatedAt}
    >
      {transactionData ? (
        <div className="relative">
          <TransactionSortTabs current={sort} onChange={setSort} />
          <TransactionTable
            transactions={transactions}
            total={transactionData.total}
            page={transactionData.page}
            perPage={transactionData.perPage}
          />

          {/* テーブルの下端にかかるグラデーションと、全件ページへの「もっと見る」 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-32 items-end justify-center bg-gradient-to-t from-white via-white/80 to-transparent pb-[5px]">
            <Link
              href={allHref}
              aria-label="すべての出入金を見る"
              className="pointer-events-auto inline-flex h-[52px] w-[240px] items-center justify-center rounded-full border border-[#111827] bg-white text-base font-bold text-[#1F2937] hover:bg-[#F9FAFB]"
            >
              もっと見る
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">取引データが取得できませんでした</div>
      )}
    </SectionCard>
  );
}
