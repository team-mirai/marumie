import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";
import TransactionTableBody from "@/client/components/top-page/features/transactions-table/TransactionTableBody";
import TransactionTableHeader from "@/client/components/top-page/features/transactions-table/TransactionTableHeader";

interface TransactionTableProps {
  transactions: DisplayTransaction[];
  allowControl?: boolean;
  onSort?: (field: "date" | "amount") => void;
  currentSort?: "date" | "amount" | null;
  currentOrder?: "asc" | "desc" | null;
  total?: number;
  page?: number;
  perPage?: number;
  onApplyFilter?: (selectedKeys: string[]) => void;
  selectedCategories?: string[];
}

export default function TransactionTable({
  transactions,
  allowControl = false,
  onSort,
  currentSort,
  currentOrder,
  onApplyFilter,
  selectedCategories,
}: TransactionTableProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-visible">
        <table className="min-w-full bg-white" aria-label="政治資金取引一覧表">
          {/* Show header only on desktop */}
          <TransactionTableHeader
            allowControl={allowControl}
            onSort={onSort}
            currentSort={currentSort}
            currentOrder={currentOrder}
            onApplyFilter={onApplyFilter}
            selectedCategories={selectedCategories}
          />
          <TransactionTableBody transactions={transactions} />
        </table>
      </div>
    </div>
  );
}
