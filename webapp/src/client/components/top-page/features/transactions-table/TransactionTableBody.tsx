import type { DisplayTransaction } from "@/server/contexts/public-finance/domain/models/display-transaction";
import TransactionTableRow from "./TransactionTableRow";

interface TransactionTableBodyProps {
  transactions: DisplayTransaction[];
  categoryHref?: (categoryKey: string) => string;
}

export default function TransactionTableBody({
  transactions,
  categoryHref,
}: TransactionTableBodyProps) {
  return (
    <tbody className="bg-white">
      {transactions.map((transaction) => (
        <TransactionTableRow
          key={transaction.id}
          transaction={transaction}
          categoryHref={categoryHref}
        />
      ))}
    </tbody>
  );
}
