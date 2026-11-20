"use client";
import "client-only";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SectionCard from "@/client/components/layout/SectionCard";
import TransactionTable from "@/client/components/top-page/features/transactions-table/TransactionTable";
import TransactionSortTabs from "@/client/components/transactions/TransactionSortTabs";
import { organizationTransactionsHref, type TransactionSort } from "@/client/lib/transaction-sort";

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
 * ここで読み込んでいるのは最新の数件だけなので、SP の並び替えタブはその場で並べ替えず、
 * 押した並び順の全件ページへ移る（年全体をその並び順で並べた1ページ目が出る）。
 */
export default function TransactionsSection({
  transactionData,
  updatedAt,
  slug,
  year,
  eyebrow,
}: TransactionsSectionProps) {
  const router = useRouter();
  const handleSortChange = (sort: TransactionSort) => {
    router.push(organizationTransactionsHref(slug, year, sort));
  };

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
          <TransactionSortTabs current="new" onChange={handleSortChange} />
          <TransactionTable
            transactions={transactionData.transactions}
            total={transactionData.total}
            page={transactionData.page}
            perPage={transactionData.perPage}
          />

          {/* テーブルの下端にかかるグラデーションと、全件ページへの「もっと見る」 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-32 items-end justify-center bg-gradient-to-t from-white via-white/80 to-transparent pb-[5px]">
            <Link
              href={organizationTransactionsHref(slug, year, "new")}
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
