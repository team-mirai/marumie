"use client";
import "client-only";

import type { TransactionWithOrganization } from "@/server/contexts/shared/domain/transaction";
import { TableCell, TableRow } from "@/client/components/ui";
import { formatAmount, formatDate } from "@/client/lib";
import { CategoryPill } from "@/client/components/transactions/CategoryPill";
import { TransactionTypeBadge } from "@/client/components/transactions/TransactionTypeBadge";
import { DeleteTransactionButton } from "@/client/components/transactions/DeleteTransactionButton";

interface TransactionRowProps {
  transaction: TransactionWithOrganization;
  onDeleted?: () => void;
}

export function TransactionRow({ transaction, onDeleted }: TransactionRowProps) {
  return (
    <TableRow>
      <TableCell className="font-latin text-xs text-muted-foreground">
        {transaction.transaction_no}
      </TableCell>
      <TableCell className="font-latin text-[13px]">
        {formatDate(transaction.transaction_date)}
      </TableCell>
      <TableCell className="text-[13px]">
        {transaction.political_organization_name || "-"}
      </TableCell>
      <TableCell className="text-[13px]">
        {transaction.debit_account}
        {transaction.debit_sub_account && (
          <div className="text-xs text-muted-foreground">{transaction.debit_sub_account}</div>
        )}
      </TableCell>
      <TableCell className="font-latin text-right text-[13px] font-semibold">
        {formatAmount(transaction.debit_amount)}
      </TableCell>
      <TableCell className="text-[13px]">
        {transaction.credit_account}
        {transaction.credit_sub_account && (
          <div className="text-xs text-muted-foreground">{transaction.credit_sub_account}</div>
        )}
      </TableCell>
      <TableCell className="font-latin text-right text-[13px] font-semibold">
        {formatAmount(transaction.credit_amount)}
      </TableCell>
      <TableCell>
        <TransactionTypeBadge type={transaction.transaction_type} />
      </TableCell>
      <TableCell>
        <CategoryPill transaction={transaction} />
      </TableCell>
      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
        <div className="truncate" title={transaction.description || undefined}>
          {transaction.description || "-"}
        </div>
        {transaction.label && (
          <div className="mt-1 truncate" title={transaction.label}>
            ラベル: {transaction.label}
          </div>
        )}
      </TableCell>
      <TableCell className="text-center">
        <DeleteTransactionButton transaction={transaction} onDeleted={onDeleted} />
      </TableCell>
    </TableRow>
  );
}
