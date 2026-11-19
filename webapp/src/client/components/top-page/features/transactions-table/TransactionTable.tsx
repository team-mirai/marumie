import type { TransactionSort } from "@/client/lib/transaction-sort";
import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";
import TransactionTableBody from "@/client/components/top-page/features/transactions-table/TransactionTableBody";
import TransactionTableHeader from "@/client/components/top-page/features/transactions-table/TransactionTableHeader";

interface TransactionTableProps {
  transactions: DisplayTransaction[];
  allowControl?: boolean;
  sort?: TransactionSort;
  onSortChange?: (sort: TransactionSort) => void;
  total?: number;
  page?: number;
  perPage?: number;
  onApplyFilter?: (selectedKeys: string[]) => void;
  selectedCategories?: string[];
  /** 渡すと各行のカテゴリーのラベルを、そのカテゴリーで絞り込むリンクにする */
  categoryHref?: (categoryKey: string) => string;
}

export default function TransactionTable({
  transactions,
  allowControl = false,
  sort,
  onSortChange,
  onApplyFilter,
  selectedCategories,
  categoryHref,
}: TransactionTableProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-visible">
        <table className="min-w-full bg-white" aria-label="政治資金取引一覧表">
          {/* Show header only on desktop */}
          <TransactionTableHeader
            allowControl={allowControl}
            sort={sort}
            onSortChange={onSortChange}
            onApplyFilter={onApplyFilter}
            selectedCategories={selectedCategories}
          />
          <TransactionTableBody transactions={transactions} categoryHref={categoryHref} />
        </table>
      </div>
    </div>
  );
}
